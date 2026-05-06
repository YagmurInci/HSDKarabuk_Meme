import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { validateSession, calculateScore } from "@/app/lib/anti-cheat";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";
import { validateUsername as validateProfanity } from "@/app/lib/profanity";
import type { GameSubmitRequest, GameSubmitResponse, ApiError } from "@/app/lib/types";
import { GAME_CONFIG } from "@/app/lib/types";

// ============================================
// POST /api/game/submit
// Oyun sonucu gönderimi. SKOR BURADA HESAPLANIR.
// Client sadece cevaplarını ve süresini gönderir.
// ============================================

function validateUsername(username: string): string | null {
  if (!username || typeof username !== "string") return "Kullanıcı adı zorunludur.";
  const result = validateProfanity(username);
  return result || null; // boş string = geçerli → null döner
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = checkRateLimit(ip, "game-submit", RATE_LIMITS.GAME_SUBMIT);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Çok fazla skor gönderimi. Lütfen bekleyin.", code: "RATE_LIMITED" } satisfies ApiError,
        { status: 429 }
      );
    }

    // Body parse
    const body: GameSubmitRequest = await request.json();
    const { sessionToken, username, answers, timeTakenMs } = body;

    // Input validation
    if (!sessionToken || !username || !answers || !Array.isArray(answers) || typeof timeTakenMs !== "number") {
      return NextResponse.json(
        { error: "Eksik veya geçersiz veri.", code: "VALIDATION_ERROR" } satisfies ApiError,
        { status: 400 }
      );
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json(
        { error: usernameError, code: "VALIDATION_ERROR" } satisfies ApiError,
        { status: 400 }
      );
    }

    // Süre mantık kontrolü
    if (timeTakenMs < 0 || timeTakenMs > GAME_CONFIG.SESSION_TTL_MS) {
      return NextResponse.json(
        { error: "Geçersiz süre değeri.", code: "VALIDATION_ERROR" } satisfies ApiError,
        { status: 400 }
      );
    }

    // ★ ANTİ-CHEAT: Minimum süre kontrolü
    // 10 soru için en az 500ms/soru = 5000ms gerekli
    const MIN_TIME_PER_QUESTION_MS = 500;
    const minRequiredMs = answers.length * MIN_TIME_PER_QUESTION_MS;
    if (timeTakenMs < minRequiredMs) {
      return NextResponse.json(
        { error: "Süre doğrulaması başarısız — çok hızlı.", code: "VALIDATION_ERROR" } satisfies ApiError,
        { status: 400 }
      );
    }

    // Anti-cheat: Session doğrulaması
    const sessionResult = await validateSession(sessionToken);
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code } as ApiError,
        { status: 403 }
      );
    }

    const { session } = sessionResult;

    // Cevap sayısı kontrolü
    if (answers.length !== session.memeIds.length) {
      return NextResponse.json(
        { error: `Tam ${session.memeIds.length} cevap gönderilmeli.`, code: "VALIDATION_ERROR" } satisfies ApiError,
        { status: 400 }
      );
    }

    // Gönderilen memeId'lerin session'daki memeId'lerle eşleştiğini kontrol et
    const sessionMemeSet = new Set(session.memeIds);
    for (const answer of answers) {
      if (!sessionMemeSet.has(answer.memeId)) {
        return NextResponse.json(
          { error: "Geçersiz soru ID'si tespit edildi.", code: "VALIDATION_ERROR" } satisfies ApiError,
          { status: 400 }
        );
      }
    }

    // Server-side doğru cevap kontrolü
    const memes = await prisma.meme.findMany({
      where: { id: { in: session.memeIds } },
      select: { id: true, correctOptionId: true },
    });
    const correctMap = new Map(memes.map((m) => [m.id, m.correctOptionId]));

    let correctCount = 0;
    const correctMemeIds: string[] = [];
    for (const answer of answers) {
      if (correctMap.get(answer.memeId) === answer.selectedOptionId) {
        correctCount++;
        correctMemeIds.push(answer.memeId);
      }
    }

    // ★ Doğru bilinen memelerin timesCorrect sayacını artır
    if (correctMemeIds.length > 0) {
      await prisma.meme.updateMany({
        where: { id: { in: correctMemeIds } },
        data: { timesCorrect: { increment: 1 } },
      });
    }

    // SERVER-SIDE SKOR HESAPLAMA
    // ★ ANTİ-CHEAT: Server zamanı ile cross-check
    // Client'ın bildirdiği süre, server'ın bildiği gerçek geçen süreden
    // fazla olamaz (ama video izleme süresi çıkarıldığı için az olabilir)
    const serverElapsedMs = Date.now() - session.startedAt.getTime();
    // Client süresi sunucu süresinden büyükse → manipülasyon
    if (timeTakenMs > serverElapsedMs + 2000) { // 2sn tolerans (network lag)
      return NextResponse.json(
        { error: "Süre doğrulaması başarısız.", code: "VALIDATION_ERROR" } satisfies ApiError,
        { status: 400 }
      );
    }
    // Skor hesaplamasında sunucu süresini de dikkate al:
    // Client bildirdiği süreyi kullan ama serverElapsedMs'nin %20'sinden az olamaz
    // (video izleme süresi çıkarıldığında bile minimum bir oran beklenir)
    const minAcceptableMs = Math.floor(serverElapsedMs * 0.05); // en az %5'i düşünme olmalı
    const effectiveTimeMs = Math.max(timeTakenMs, minAcceptableMs);
    const score = calculateScore(correctCount, effectiveTimeMs);

    // Session'ı tamamlandı olarak işaretle (tekrar kullanım engeli)
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { completed: true },
    });

    // Leaderboard'a kaydet
    await prisma.leaderboardEntry.create({
      data: {
        username: username.trim(),
        score,
        correctCount,
        totalTime: timeTakenMs,
        sessionId: session.id,
      },
    });

    // Sıralama hesapla
    const rank = await prisma.leaderboardEntry.count({
      where: { score: { gt: score } },
    });

    const response: GameSubmitResponse = {
      score,
      correctCount,
      totalQuestions: session.memeIds.length,
      rank: rank + 1,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[/api/game/submit] Error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası.", code: "INTERNAL_ERROR" } satisfies ApiError,
      { status: 500 }
    );
  }
}
