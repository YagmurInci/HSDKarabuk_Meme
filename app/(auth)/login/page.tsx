"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Leaderboard from "@/app/components/leaderboard";
import { validateUsername } from "@/app/lib/profanity";
const SHOWCASE_MEMES = [
  { id: "j0gRQNEJGmk", title: "Kaplumbağa Ninen" },
  { id: "AYLnGsWj7us", title: "Ben İmamım Gülmem" },
  { id: "efOyzBCLreg", title: "Yazık Kafana" },
  { id: "1QQSn9JCHpo", title: "SUS LAN" },
  { id: "EmRjDzwrCmg", title: "Nereye Gidiyorsun?" },
  { id: "GMSi3sU7IAM", title: "Gülmem Geldi" },
  { id: "YOVVcVhaq7k", title: "Abi Geldiler Abi" },
  { id: "828WG2TJGNk", title: "Aç Lan Kapıyı" },
  { id: "5WdN6vDCy2o", title: "Böyle Bir Şey Olabilir mi" },
  { id: "hWlFloxqMxA", title: "2 Gün Dinozor Gördüm" },
  { id: "u2zxWEuj3S8", title: "Menüde Ne Var?" },
  { id: "RYw8GehHBbs", title: "İyi ki Doğdun Muzaffer" },
];

// YouTube thumbnail URL builder
function thumb(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUsername(username);
    if (err) {
      setError(err);
    } else {
      localStorage.setItem("meme_guesser_username", username);
      router.push("/play");
    }
  };

  // Floating meme kartları için 5 tanesi seçilir
  const floatingMemes = SHOWCASE_MEMES.slice(0, 5);

  // Arka plan thumbnail grid'i için diğerleri
  const bgMemes = SHOWCASE_MEMES.slice(2, 10);

  return (
    <main className="login-page">
      {/* --- Arka plan thumbnail dekor --- */}
      <div className="thumbnail-grid" aria-hidden="true">
        {bgMemes.map((m, i) => {
          // Dağınık yerleşim
          const positions = [
            { top: "8%", left: "5%", w: 140 },
            { top: "60%", left: "2%", w: 120 },
            { top: "20%", right: "3%", w: 130 },
            { top: "75%", right: "8%", w: 150 },
            { top: "40%", left: "30%", w: 100 },
            { bottom: "10%", left: "45%", w: 110 },
            { top: "5%", left: "55%", w: 90 },
            { bottom: "25%", right: "25%", w: 120 },
          ];
          const pos = positions[i % positions.length];
          return (
            <div
              key={m.id}
              className="thumbnail-item"
              style={{
                ...pos,
                width: pos.w,
                height: pos.w * 0.75,
                animationDelay: `${i * 3}s`,
                animationDuration: `${18 + i * 2}s`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb(m.id)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
          );
        })}
      </div>

      {/* --- Hero --- */}
      <section className="hero-section">
        {/* Sol: Login */}
        <div className="login-column">
          <div className="login-badge">Meme Tahmin Oyunu</div>

          <h1 className="login-heading">
            <span className="gradient-text">Meme</span>
            <br />
            Guesser
          </h1>

          <p className="login-subtitle">
            YouTube&apos;daki efsane <strong>meme kliplerini</strong> izle,
            hangi meme olduğunu tahmin et. En hızlı sen ol,
            <strong> lider tablosunda</strong> yerini al.
          </p>

          <form
            id="login-form"
            className="login-card"
            onSubmit={handleStart}
            autoComplete="off"
          >
            <div className="input-wrapper">
              <label htmlFor="username-input" className="input-label">
                Kullanıcı Adın
              </label>
              <input
                id="username-input"
                className="username-input"
                type="text"
                placeholder="Adını gir..."
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                maxLength={20}
              />
              {error && (
                <span id="username-error" className="input-error">
                  {error}
                </span>
              )}
            </div>

            <button
              id="start-game-btn"
              className="start-btn"
              type="submit"
              disabled={username.length < 2}
            >
              Oyuna Başla →
            </button>
          </form>

          {/* Leaderboard */}
          <div className="leaderboard-section">
            <Leaderboard compact={true} />
          </div>
        </div>

        {/* Sağ: Floating meme kartları */}
        <div className="visual-column" aria-hidden="true">
          {floatingMemes.map((m) => (
            <div key={m.id} className="meme-float-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb(m.id)}
                alt={m.title}
                loading="lazy"
                decoding="async"
              />
              <div className="play-icon" />
              <div className="meme-label">{m.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="page-footer">
        <div className="social-links">
          <a
            href="https://www.instagram.com/hsdkarabuk/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link instagram"
          >
            📸 Instagram
          </a>
          <a
            href="https://chat.whatsapp.com/D37UjhZBCkK0DNFy699WED"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link whatsapp"
          >
            💬 WhatsApp
          </a>
          <a
            href="https://github.com/mlhgks0868/HSDKarabuk_Meme"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link github"
          >
            🔗 GitHub
          </a>
        </div>
        <p>Meme Guesser — HSD Karabük</p>
      </footer>
    </main>
  );
}