import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// ============================================
// GET /api/leaderboard/timer
// Sonraki sıfırlama zamanını döner.
// Client tarafı geri sayım için kullanılır.
// ============================================

const RESET_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 saat

export async function GET() {
  try {
    const lastArchive = await prisma.leaderboardArchive.findFirst({
      orderBy: { archivedAt: "desc" },
      select: { archivedAt: true },
    });

    const lastResetAt = lastArchive?.archivedAt || new Date();
    const nextResetAt = new Date(lastResetAt.getTime() + RESET_INTERVAL_MS);

    return NextResponse.json({
      lastResetAt: lastResetAt.toISOString(),
      nextResetAt: nextResetAt.toISOString(),
      remainingMs: Math.max(0, nextResetAt.getTime() - Date.now()),
    });
  } catch (error) {
    console.error("[/api/leaderboard/timer] Error:", error);
    return NextResponse.json({
      lastResetAt: new Date().toISOString(),
      nextResetAt: new Date(Date.now() + RESET_INTERVAL_MS).toISOString(),
      remainingMs: RESET_INTERVAL_MS,
    });
  }
}
