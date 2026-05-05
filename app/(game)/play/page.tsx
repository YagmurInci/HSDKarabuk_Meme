// ============================================
// OYUN SAYFASI - YAĞMUR'UN ÇALIŞMA ALANI
// Branch: feature/game-engine
// Görev dosyası: docs/prompts/YAGMUR_GAME_ENGINE.md
// ============================================

// TODO: [YAĞMUR] YouTube IFrame Player API entegrasyonu
// TODO: [YAĞMUR] 10 soruluk oyun döngüsü state yönetimi
// TODO: [YAĞMUR] Zamanlayıcı (timer) mantığı
// TODO: [YAĞMUR] Şıkların render edilmesi ve seçim mantığı

export default function PlayPage() {
  return (
    <main id="game-page" className="game-container">
      <div id="game-header" className="game-header">
        <h1 className="game-title">Meme Guesser</h1>
        <div id="game-timer" className="game-timer">
          {/* TODO: [YAĞMUR] Timer component */}
          <span className="timer-text">00:00</span>
        </div>
        <div id="game-progress" className="game-progress">
          {/* TODO: [YAĞMUR] Soru sayacı (ör: 3/10) */}
          <span className="progress-text">0/10</span>
        </div>
      </div>

      <div id="video-wrapper" className="video-wrapper">
        {/* TODO: [YAĞMUR] YouTube IFrame Player buraya mount edilecek */}
        <div id="youtube-player" className="youtube-player-placeholder">
          YouTube Player Yüklenecek
        </div>
      </div>

      <div id="options-container" className="options-container">
        {/* TODO: [YAĞMUR] 4 şık butonu dinamik render */}
        <button id="option-0" className="option-btn" disabled>Şık A</button>
        <button id="option-1" className="option-btn" disabled>Şık B</button>
        <button id="option-2" className="option-btn" disabled>Şık C</button>
        <button id="option-3" className="option-btn" disabled>Şık D</button>
      </div>

      <div id="game-result" className="game-result" style={{ display: "none" }}>
        {/* TODO: [YAĞMUR] Oyun sonu sonuç ekranı */}
        <h2 className="result-title">Sonuçlar</h2>
        <p id="result-score" className="result-score">Skor: 0</p>
        <p id="result-correct" className="result-correct">Doğru: 0/10</p>
      </div>
    </main>
  );
}
