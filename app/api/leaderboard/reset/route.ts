import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// ============================================
// GET /api/leaderboard/reset
// 3 saatlik periyotlarla leaderboard'ı sıfırlar.
// Sıfırlamadan önce arşiv snapshot'ı kaydeder.
// Vercel Cron veya harici bir cron ile tetiklenir.
// Güvenlik: CRON_SECRET header kontrolü.
// ============================================

const CRON_SECRET = process.env.CRON_SECRET || process.env.GAME_SECRET;

export async function GET(request: NextRequest) {
  // Auth kontrolü
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  
  if (authHeader !== `Bearer ${CRON_SECRET}` && cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Mevcut leaderboard snapshot'ını al
    const currentLeaderboard = await prisma.leaderboardEntry.findMany({
      orderBy: { score: "desc" },
      take: 50,
      select: {
        username: true,
        score: true,
        correctCount: true,
        totalTime: true,
        createdAt: true,
      },
    });

    // 2. Arşive kaydet (leaderboard_archives tablosu)
    const archiveData = {
      snapshot: JSON.stringify(currentLeaderboard),
      entryCount: currentLeaderboard.length,
      topPlayer: currentLeaderboard[0]?.username || null,
      topScore: currentLeaderboard[0]?.score || 0,
      archivedAt: new Date(),
    };

    await prisma.leaderboardArchive.create({ data: archiveData });

    // 3. Leaderboard'ı sıfırla
    const deletedEntries = await prisma.leaderboardEntry.deleteMany({});
    
    // 4. Tamamlanmış eski session'ları temizle (opsiyonel)
    const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 saat öncesi
    await prisma.gameSession.deleteMany({
      where: {
        completed: true,
        startedAt: { lt: cutoff },
      },
    });

    return NextResponse.json({
      success: true,
      archived: archiveData.entryCount,
      deleted: deletedEntries.count,
      topPlayer: archiveData.topPlayer,
      topScore: archiveData.topScore,
      archivedAt: archiveData.archivedAt.toISOString(),
    });
  } catch (error) {
    console.error("[/api/leaderboard/reset] Error:", error);
    return NextResponse.json(
      { error: "Sıfırlama hatası.", detail: String(error) },
      { status: 500 }
    );
  }
}
