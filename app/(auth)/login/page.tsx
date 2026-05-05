"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Yasaklı kelimeler listesi (Görev dökümanındaki liste)
  const bannedWords = ["admin", "fuck", "shit", "sikti", "amk", "orospu", "piç"];

  const validateUsername = (name: string) => {
    const regex = /^[a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s_-]+$/;

    if (!name) return "Kullanıcı adı boş bırakılamaz.";
    if (name.length < 2) return "İsim en az 2 karakter olmalı.";
    if (name.length > 20) return "İsim en fazla 20 karakter olmalı.";
    if (!regex.test(name)) return "Geçersiz karakterler (Sadece harf, rakam, _, -).";
    if (bannedWords.some(word => name.toLowerCase().includes(word))) return "Bu ismi kullanamazsın!";
    
    return "";
  };

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateUsername(username);

    if (validationError) {
      setError(validationError);
    } else {
      // ✅ LocalStorage'a kaydet
      localStorage.setItem("meme_guesser_username", username);
      // ✅ Oyun sayfasına yönlendir
      router.push("/play");
    }
  };

  return (
    <main id="login-page" className="login-container">
      <div id="login-header" className="login-header">
        <h1 className="login-title">Meme Guesser</h1>
        <p className="login-subtitle">YouTube meme tahmin oyunu</p>
      </div>

      <form id="login-form" className="login-form" onSubmit={handleStartGame}>
        <div className="input-group">
          <label htmlFor="username-input" className="input-label">
            Kullanıcı Adın
          </label>
          <input
            id="username-input"
            className="username-input text-black p-2 rounded border"
            type="text"
            placeholder="Adını gir..."
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(""); // Yazmaya başlayınca hatayı temizle
            }}
            autoComplete="off"
          />
          
          {/* ✅ Hata mesajı artık burada görünecek */}
          {error && (
            <span id="username-error" className="input-error" style={{ color: "red", display: "block", marginTop: "5px" }}>
              {error}
            </span>
          )}
        </div>

        <button
          id="start-game-btn"
          className="start-game-btn"
          type="submit"
          disabled={username.length < 2} // ✅ Validasyon kuralı
          style={{ 
            marginTop: "10px",
            padding: "10px",
            backgroundColor: username.length < 2 ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: username.length < 2 ? "not-allowed" : "pointer"
          }}
        >
          Oyuna Başla
        </button>
      </form>

      <div id="leaderboard-wrapper" className="leaderboard-wrapper">
        {/* TODO: [NESLİHAN] Leaderboard component buraya yerleştirilecek */}
        <p style={{ opacity: 0.5, marginTop: "20px" }}>Liderlik Tablosu Bekleniyor...</p>
      </div>
    </main>
  );
} 