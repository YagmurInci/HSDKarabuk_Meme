// ============================================
// LOGIN / LANDING SAYFASI - CEMRE'NİN ÇALIŞMA ALANI
// Branch: feature/login
// Görev dosyası: docs/prompts/CEMRE_AUTH_LOGIN.md
// ============================================

// TODO: [CEMRE] Username input validasyonu (boş, küfür, uzunluk)
// TODO: [CEMRE] LocalStorage/State'e kayıt
// TODO: [CEMRE] Oyun sayfasına yönlendirme (router.push)

export default function LoginPage() {
  return (
    <main id="login-page" className="login-container">
      <div id="login-header" className="login-header">
        <h1 className="login-title">Meme Guesser</h1>
        <p className="login-subtitle">YouTube meme tahmin oyunu</p>
      </div>

      <form id="login-form" className="login-form">
        <div className="input-group">
          <label htmlFor="username-input" className="input-label">
            Kullanıcı Adın
          </label>
          <input
            id="username-input"
            className="username-input"
            type="text"
            placeholder="Adını gir..."
            maxLength={20}
            minLength={2}
            required
            autoComplete="off"
          />
          <span id="username-error" className="input-error" style={{ display: "none" }}>
            {/* TODO: [CEMRE] Hata mesajları burada gösterilecek */}
          </span>
        </div>

        <button
          id="start-game-btn"
          className="start-game-btn"
          type="submit"
          disabled
        >
          Oyuna Başla
        </button>
      </form>

      <div id="leaderboard-wrapper" className="leaderboard-wrapper">
        {/* TODO: [NESLİHAN] Leaderboard component buraya yerleştirilecek */}
        {/* Bu div'e DOKUNMAYIN - Neslihan dolduracak */}
      </div>
    </main>
  );
}
