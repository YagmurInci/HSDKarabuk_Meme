// ============================================
// LEADERBOARDCOMPONENTİ - NESLİHAN'IN ÇALIŞMA ALANI
// Branch: feature/leaderboard
// Görev dosyası: docs/prompts/NESLIHAN_LEADERBOARD.md
// ============================================

// TODO: [NESLİHAN] /api/leaderboard'dan veri çekme (fetch)
// TODO: [NESLİHAN] Loading state
// TODO: [NESLİHAN] Error state
// TODO: [NESLİHAN] Top 20 listeleme

// Bu component hem login sayfasında hem de oyun sonu ekranında kullanılacak.
// Props olarak compact={true} geçilirse küçük versiyon gösterilir.

interface LeaderboardProps {
  compact?: boolean; // Ana sayfadaki küçük versiyon için
}

export default function Leaderboard({ compact = false }: LeaderboardProps) {
  return (
    <div id="leaderboard-component" className={`leaderboard-component ${compact ? "leaderboard-compact" : "leaderboard-full"}`}>
      <h2 className="leaderboard-title">
        {compact ? "En İyi Oyuncular" : "Liderlik Tablosu"}
      </h2>

      {/* Loading State */}
      <div id="leaderboard-loading" className="leaderboard-loading">
        Yükleniyor...
      </div>

      {/* Error State */}
      <div id="leaderboard-error" className="leaderboard-error" style={{ display: "none" }}>
        Skorlar yüklenirken hata oluştu.
      </div>

      {/* Leaderboard Listesi */}
      <ul id="leaderboard-list" className="leaderboard-list">
        {/* TODO: [NESLİHAN] Dinamik liste elemanları */}
        <li className="leaderboard-item leaderboard-item-placeholder">
          <span className="leaderboard-rank">1</span>
          <span className="leaderboard-username">---</span>
          <span className="leaderboard-score">0</span>
        </li>
      </ul>
    </div>
  );
}
