// ============================================
// MEME GUESSER - SHARED TYPE DEFINITIONS
// Tüm ekip üyeleri bu tipleri import ederek kullanır.
// Baş Mimar: Şükrü | DOKUNMAYIN (değişiklik gerekirse PM'e danışın)
// ============================================

// ---- API Request/Response Types ----

/** POST /api/game/start - Oyun başlatma yanıtı */
export interface GameStartResponse {
  sessionToken: string;
  memes: MemeForClient[];
}

/** Client'a gönderilen meme verisi */
export interface MemeForClient {
  id: string;
  youtubeUrl: string;
  startTime: number;
  endTime: number;
  correctOptionId: string; // Doğru/yanlış feedback için (cevap kilitlendikten sonra gösterilir)
  options: OptionForClient[]; // 4 şık (1 doğru, 3 yanlış - karıştırılmış)
}

/** Client'a gönderilen şık verisi */
export interface OptionForClient {
  id: string;
  text: string;
}

/** POST /api/game/submit - Oyun sonucu gönderimi */
export interface GameSubmitRequest {
  sessionToken: string;
  username: string;
  answers: PlayerAnswer[];
  timeTakenMs: number; // Toplam geçen süre (milisaniye)
}

/** Tek bir soru için oyuncunun cevabı */
export interface PlayerAnswer {
  memeId: string;
  selectedOptionId: string;
}

/** POST /api/game/submit - Oyun sonucu yanıtı */
export interface GameSubmitResponse {
  score: number;
  correctCount: number;
  totalQuestions: number;
  rank: number; // Liderlik tablosundaki sıralama
}

/** GET /api/leaderboard - Liderlik tablosu girişi */
export interface LeaderboardItem {
  rank: number;
  username: string;
  score: number;
  correctCount: number;
  totalTime: number;
  createdAt: string;
}

/** API Hata yanıtı (tüm endpointlerde ortak) */
export interface ApiError {
  error: string;
  code: "INVALID_SESSION" | "SESSION_EXPIRED" | "SESSION_USED" | "RATE_LIMITED" | "VALIDATION_ERROR" | "UNAUTHORIZED" | "INTERNAL_ERROR" | "SHEETS_ERROR";
}

// ---- Game Constants ----
export const GAME_CONFIG = {
  QUESTIONS_PER_GAME: 10,
  OPTIONS_PER_QUESTION: 4,
  SESSION_TTL_MS: 5 * 60 * 1000, // 5 dakika
  SCORE_PER_CORRECT: 1000,
  TIME_PENALTY_PER_SECOND: 5,
  MIN_SCORE: 0,
  MAX_USERNAME_LENGTH: 20,
  MIN_USERNAME_LENGTH: 2,
} as const;
