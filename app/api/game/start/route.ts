import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { createGameSession } from "@/app/lib/anti-cheat";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";
import type { GameStartResponse, MemeForClient, OptionForClient } from "@/app/lib/types";
import { GAME_CONFIG } from "@/app/lib/types";
import type { Meme, Option } from "@prisma/client";

// ============================================
// POST /api/game/start
// Yeni oyun oturumu başlatır, rastgele 10 meme döner.
// correctOptionId CLIENT'A GÖNDERİLMEZ.
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = checkRateLimit(ip, "game-start", RATE_LIMITS.GAME_START);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen bekleyin.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)) } }
      );
    }

    // Oyun session'ı oluştur
    const { sessionToken, memeIds } = await createGameSession(ip);

    // Meme'leri şıklarıyla birlikte çek (correctOptionId HARİÇ)
    const memes = await prisma.meme.findMany({
      where: { id: { in: memeIds } },
      include: { correctOption: true },
    });

    // Her meme için 4 şık hazırla (1 doğru + 3 rastgele yanlış)
    const memesForClient: MemeForClient[] = await Promise.all(
      memes.map(async (meme: Meme & { correctOption: Option }) => {
        // 3 rastgele yanlış şık çek (doğru cevap hariç)
        const wrongOptions = await prisma.$queryRawUnsafe<{ id: string; text: string }[]>(
          `SELECT id, text FROM options WHERE id != $1 ORDER BY RANDOM() LIMIT $2`,
          meme.correctOptionId,
          GAME_CONFIG.OPTIONS_PER_QUESTION - 1
        );

        // Doğru şık + yanlış şıkları birleştir ve karıştır
        const allOptions: OptionForClient[] = [
          { id: meme.correctOption.id, text: meme.correctOption.text },
          ...wrongOptions.map((o) => ({ id: o.id, text: o.text })),
        ].sort(() => Math.random() - 0.5); // Fisher-Yates değil ama hackathon için yeterli

        return {
          id: meme.id,
          youtubeUrl: meme.youtubeUrl,
          startTime: meme.startTime,
          endTime: meme.endTime,
          options: allOptions,
        };
      })
    );

    const response: GameStartResponse = {
      sessionToken,
      memes: memesForClient,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    if (error?.code !== 'ECONNREFUSED' && !error?.message?.includes('Invalid `prisma.meme.count()` invocation')) {
      console.error("[/api/game/start] Error:", error);
    }
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
