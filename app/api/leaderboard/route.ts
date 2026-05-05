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
