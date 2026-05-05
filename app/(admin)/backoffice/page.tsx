// ============================================
// ADMIN PANELİ - CEYDA'NIN ÇALIŞMA ALANI
// Branch: feature/admin
// Görev dosyası: docs/prompts/CEYDA_ADMIN.md
// ============================================

// TODO: [CEYDA] Admin şifre girişi
// TODO: [CEYDA] Meme ekleme formu (YouTube link, start, end, doğru cevap)
// TODO: [CEYDA] Şık (Option) ekleme/silme
// TODO: [CEYDA] Leaderboard moderasyon (uygunsuz isim/hile silme)

export default function BackofficePage() {
  return (
    <main id="admin-page" className="admin-container">
      <h1 className="admin-title">Meme Guesser - Admin Panel</h1>

      {/* Admin Auth Bariyeri */}
      <div id="admin-auth" className="admin-auth-section">
        <label htmlFor="admin-password" className="admin-label">Admin Şifresi:</label>
        <input id="admin-password" className="admin-password-input" type="password" />
        <button id="admin-login-btn" className="admin-login-btn">Giriş</button>
      </div>

      {/* Meme Yönetimi */}
      <section id="meme-management" className="admin-section" style={{ display: "none" }}>
        <h2>Soru (Meme) Yönetimi</h2>
        <form id="add-meme-form" className="add-meme-form">
          <input id="meme-youtube-url" className="admin-input" placeholder="YouTube URL" />
          <input id="meme-start-time" className="admin-input" type="number" placeholder="Başlangıç (sn)" />
          <input id="meme-end-time" className="admin-input" type="number" placeholder="Bitiş (sn)" />
          <select id="meme-correct-option" className="admin-select">
            <option value="">Doğru cevabı seçin...</option>
            {/* TODO: [CEYDA] Option listesini API'den çekip doldur */}
          </select>
          <button id="add-meme-btn" className="admin-btn" type="submit">Meme Ekle</button>
        </form>
        <div id="meme-list" className="admin-list">
          {/* TODO: [CEYDA] Mevcut meme'lerin listesi */}
        </div>
      </section>

      {/* Şık (Option) Yönetimi */}
      <section id="option-management" className="admin-section" style={{ display: "none" }}>
        <h2>Şık Havuzu Yönetimi</h2>
        <form id="add-option-form" className="add-option-form">
          <input id="option-text" className="admin-input" placeholder="Şık metni" />
          <button id="add-option-btn" className="admin-btn" type="submit">Şık Ekle</button>
        </form>
        <div id="option-list" className="admin-list">
          {/* TODO: [CEYDA] Mevcut şıkların listesi */}
        </div>
      </section>

      {/* Leaderboard Moderasyon */}
      <section id="leaderboard-moderation" className="admin-section" style={{ display: "none" }}>
        <h2>Liderlik Tablosu Moderasyonu</h2>
        <div id="leaderboard-admin-list" className="admin-list">
          {/* TODO: [CEYDA] Skorları listeleme ve silme */}
        </div>
      </section>
    </main>
  );
}
