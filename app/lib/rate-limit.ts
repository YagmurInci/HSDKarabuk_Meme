// ============================================
// IN-MEMORY RATE LIMITER
// Vercel Serverless uyumlu basit rate limiter.
// NOT: Vercel'de her cold start'ta sıfırlanır. Hackathon için yeterli.
// Production'da Redis/Upstash kullanılmalı.
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

const store = new Map<string, RateLimitEntry>();

// Periyodik temizlik (memory leak engelleme)
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  });
}, 60_000); // Her 60 saniyede temizle

interface RateLimitConfig {
  windowMs: number;   // Zaman penceresi (milisaniye)
  maxRequests: number; // Penceredeki max istek sayısı
}

/**
 * IP bazlı rate limiting kontrolü.
 * @returns `null` başarılı ise, hata mesajı reddedildiyse
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterMs?: number } {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  const entry = store.get(key);

  // Yeni pencere veya süresi dolmuş
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  // Pencere içinde ve limit aşılmamış
  if (entry.count < config.maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  // RATE LIMITED
  return {
    allowed: false,
    retryAfterMs: entry.resetAt - now,
  };
}

// Hazır konfigürasyonlar
export const RATE_LIMITS = {
  GAME_START: { windowMs: 60_000, maxRequests: 10 },  // 10 oyun/dakika
  GAME_SUBMIT: { windowMs: 60_000, maxRequests: 5 },  // 5 submit/dakika
  LEADERBOARD_GET: { windowMs: 10_000, maxRequests: 30 }, // 30 okuma/10sn
  ADMIN: { windowMs: 60_000, maxRequests: 30 },       // 30 admin işlem/dakika
} as const;
