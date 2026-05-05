import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { validateSession, calculateScore } from "@/app/lib/anti-cheat";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";
import type { GameSubmitRequest, GameSubmitResponse, ApiError } from "@/app/lib/types";
import { GAME_CONFIG } from "@/app/lib/types";

// ============================================
// POST /api/game/submit
// Oyun sonucu gönderimi. SKOR BURADA HESAPLANIR.
// Client sadece cevaplarını ve süresini gönderir.
// ============================================

// Basit küfür/yasaklı kelime filtresi
const BANNED_WORDS = ["admin", "fuck", "shit", "sikti", "amk", "orospu", "piç"];

function validateUsername(username: string): string | null {
  if (!username || typeof username !== "string") return "Kullanıcı adı zorunludur.";
  const trimmed = username.trim();
  if (trimmed.length < GAME_CONFIG.MIN_USERNAME_LENGTH) return `Kullanıcı adı en az ${GAME_CONFIG.MIN_USERNAME_LENGTH} karakter olmalı.`;
  if (trimmed.length > GAME_CONFIG.MAX_USERNAME_LENGTH) return `Kullanıcı adı en fazla ${GAME_CONFIG.MAX_USERNAME_LENGTH} karakter olabilir.`;
  if (!/^[a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s_-]+$/.test(trimmed)) return "Kullanıcı adı sadece harf, rakam, boşluk, _ ve - içerebilir.";
  const lower = trimmed.toLowerCase();
  if (BANNED_WORDS.some((w) => lower.includes(w))) return "Kullanıcı adı uygunsuz kelime içeriyor.";
  return null;
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

    // Süre mantık kontrolü (negatif veya aşırı uzun süre engelle)
    if (timeTakenMs < 0 || timeTakenMs > GAME_CONFIG.SESSION_TTL_MS) {
      return NextResponse.json(
        { error: "Geçersiz süre değeri.", code: "VALIDATION_ERROR" } satisfies ApiError,
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
    for (const answer of answers) {
      if (correctMap.get(answer.memeId) === answer.selectedOptionId) {
        correctCount++;
      }
    }

    // SERVER-SIDE SKOR HESAPLAMA
    const score = calculateScore(correctCount, timeTakenMs);

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
