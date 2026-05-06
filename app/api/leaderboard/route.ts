import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";
import type { LeaderboardItem, ApiError } from "@/app/lib/types";

// ============================================
// GET /api/leaderboard
// Top 20 skor listesini döner.
// POST burada YOK - skorlar sadece /api/game/submit üzerinden kaydedilir.
// ============================================

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = checkRateLimit(ip, "leaderboard-get", RATE_LIMITS.LEADERBOARD_GET);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek.", code: "RATE_LIMITED" } satisfies ApiError,
        { status: 429 }
      );
    }

    // URL'den limit parametresi (opsiyonel, default 20, max 100)
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(Math.max(1, limitParam), 100);

    // === 3 SAATLIK OTOMATİK SIFIRLAMA ===
    // Son arşiv zamanını kontrol et. 3 saatten fazla geçtiyse sıfırla.
    const RESET_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 saat
    try {
      const lastArchive = await prisma.leaderboardArchive.findFirst({
        orderBy: { archivedAt: "desc" },
        select: { archivedAt: true },
      });

      const shouldReset = !lastArchive || 
        (Date.now() - lastArchive.archivedAt.getTime()) > RESET_INTERVAL_MS;

      if (shouldReset) {
        // Snapshot al
        const snapshot = await prisma.leaderboardEntry.findMany({
          orderBy: { score: "desc" },
          take: 50,
          select: { username: true, score: true, correctCount: true, totalTime: true, createdAt: true },
        });

        if (snapshot.length > 0) {
          await prisma.leaderboardArchive.create({
            data: {
              snapshot: JSON.stringify(snapshot),
              entryCount: snapshot.length,
              topPlayer: snapshot[0]?.username || null,
              topScore: snapshot[0]?.score || 0,
              archivedAt: new Date(),
            },
          });
          // Sıfırla
          await prisma.leaderboardEntry.deleteMany({});
        } else if (!lastArchive) {
          // Hiç arşiv yoksa boş arşiv oluştur (zamanlama referansı)
          await prisma.leaderboardArchive.create({
            data: {
              snapshot: "[]",
              entryCount: 0,
              topPlayer: null,
              topScore: 0,
              archivedAt: new Date(),
            },
          });
        }
      }
    } catch (resetError) {
      // Sıfırlama hatası leaderboard gösterimini engellemez
      console.warn("[/api/leaderboard] Auto-reset hatası:", resetError);
    }

    const entries = await prisma.leaderboardEntry.findMany({
      orderBy: { score: "desc" },
      take: limit,
      select: {
        username: true,
        score: true,
        correctCount: true,
        totalTime: true,
        createdAt: true,
      },
    });

    const leaderboard: LeaderboardItem[] = entries.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      score: entry.score,
      correctCount: entry.correctCount,
      totalTime: entry.totalTime,
      createdAt: entry.createdAt.toISOString(),
    }));

    return NextResponse.json(leaderboard, { status: 200 });
  } catch (error) {
    console.error("[/api/leaderboard] Error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası.", code: "INTERNAL_ERROR" } satisfies ApiError,
      { status: 500 }
    );
  }
}
