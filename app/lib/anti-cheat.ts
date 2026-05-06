import crypto from "crypto";
import { prisma } from "./prisma";
import { GAME_CONFIG } from "./types";

// ============================================
// ANTI-CHEAT ENGINE
// Bu dosyaya Frontend geliştiricileri DOKUNMAMALI.
// Yalnızca Baş Mimar (Şükrü) düzenleyebilir.
// ============================================

const GAME_SECRET = process.env.GAME_SECRET || "FALLBACK_DEV_SECRET_CHANGE_IN_PROD";

/**
 * HMAC token oluşturur.
 * Payload: sessionId + memeIds (sıralı) + startedAt timestamp
 */
export function createSessionToken(sessionId: string, memeIds: string[], startedAt: Date): string {
  const payload = `${sessionId}:${memeIds.join(",")}:${startedAt.getTime()}`;
  return crypto.createHmac("sha256", GAME_SECRET).update(payload).digest("hex");
}

/**
 * HMAC token'ı doğrular ve session bilgisini döner.
 * Başarısızlık durumunda hata objesi döner.
 */
export async function validateSession(
  sessionToken: string
): Promise<
  | { valid: true; session: { id: string; memeIds: string[]; startedAt: Date } }
  | { valid: false; error: string; code: string }
> {
  // 1. Session'ı bul
  const session = await prisma.gameSession.findUnique({
    where: { sessionToken },
  });

  if (!session) {
    return { valid: false, error: "Geçersiz oturum tokeni.", code: "INVALID_SESSION" };
  }

  // 2. Tekrar kullanım kontrolü
  if (session.completed) {
    return { valid: false, error: "Bu oturum zaten kullanılmış.", code: "SESSION_USED" };
  }

  // 3. Süre kontrolü
  if (new Date() > session.expiresAt) {
    // Süresi dolmuş session'ı completed olarak işaretle
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { completed: true },
    });
    return { valid: false, error: "Oturum süresi dolmuş.", code: "SESSION_EXPIRED" };
  }

  // 4. HMAC doğrulaması
  const expectedToken = createSessionToken(session.id, session.memeIds, session.startedAt);
  if (!crypto.timingSafeEqual(Buffer.from(sessionToken), Buffer.from(expectedToken))) {
    return { valid: false, error: "Token imzası geçersiz.", code: "INVALID_SESSION" };
  }

  return {
    valid: true,
    session: {
      id: session.id,
      memeIds: session.memeIds,
      startedAt: session.startedAt,
    },
  };
}

/**
 * Yeni bir oyun session'ı oluşturur.
 * Ağırlıklı rastgele 10 meme seçer ve HMAC token üretir.
 * 
 * ★ WEIGHTED RANDOM SELECTION:
 * - Az gösterilen memeler daha yüksek ağırlık alır (çeşitlilik)
 * - Çok bilinen memeler daha düşük ağırlık alır (zorluk dengesi)
 * - Tamamen rastgele değil ama öngörülemez (RANDOM() * weight)
 */
export async function createGameSession(ipAddress?: string) {
  // 1. Toplam meme sayısını kontrol et
  const totalMemes = await prisma.meme.count();
  if (totalMemes < GAME_CONFIG.QUESTIONS_PER_GAME) {
    throw new Error(
      `Yeterli soru yok. Gereken: ${GAME_CONFIG.QUESTIONS_PER_GAME}, Mevcut: ${totalMemes}`
    );
  }

  // 2. Ağırlıklı rastgele meme seçimi
  //    Formül: RANDOM() * (1.0 / (1 + timesShown * 0.3 + timesCorrect * 0.5))
  //    - timesShown az → ağırlık yüksek → daha çok seçilir
  //    - timesCorrect çok → ağırlık düşük → daha az seçilir (zaten herkes biliyor)
  //    - RANDOM() çarpımı → hala öngörülemez, ama bias'lı
  const memes = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM memes 
     ORDER BY RANDOM() * (1.0 / (1 + "timesShown" * 0.3 + "timesCorrect" * 0.5))
     DESC
     LIMIT $1`,
    GAME_CONFIG.QUESTIONS_PER_GAME
  );
  const memeIds = memes.map((m) => m.id);

  // 3. Seçilen memelerin timesShown sayacını artır (atomic)
  await prisma.meme.updateMany({
    where: { id: { in: memeIds } },
    data: { timesShown: { increment: 1 } },
  });

  // 4. Session oluştur
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GAME_CONFIG.SESSION_TTL_MS);

  const session = await prisma.gameSession.create({
    data: {
      sessionToken: "placeholder", // geçici
      memeIds,
      startedAt: now,
      expiresAt,
      ipAddress: ipAddress || null,
    },
  });

  // 5. HMAC token oluştur (sessionId gerekli olduğu için create'den sonra)
  const sessionToken = createSessionToken(session.id, memeIds, now);
  await prisma.gameSession.update({
    where: { id: session.id },
    data: { sessionToken },
  });

  return { sessionId: session.id, sessionToken, memeIds };
}

/**
 * Sunucu tarafında skor hesaplar.
 * Formül: (doğru sayısı × 1000) - (toplam süre saniye × 5)
 * Minimum skor: 0
 */
export function calculateScore(correctCount: number, timeTakenMs: number): number {
  const timeInSeconds = Math.floor(timeTakenMs / 1000);
  const rawScore =
    correctCount * GAME_CONFIG.SCORE_PER_CORRECT -
    timeInSeconds * GAME_CONFIG.TIME_PENALTY_PER_SECOND;
  return Math.max(GAME_CONFIG.MIN_SCORE, rawScore);
}
