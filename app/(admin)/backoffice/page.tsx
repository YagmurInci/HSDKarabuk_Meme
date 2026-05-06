"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================
// ADMIN PANELİ — Meme Ekleme & Yönetim
// Tek adımlı iş akışı:
// YouTube URL + Zaman Aralığı + Doğru Cevap → Meme oluştur
// ============================================

interface Option {
  id: string;
  text: string;
}

interface Meme {
  id: string;
  youtubeUrl: string;
  startTime: number;
  endTime: number;
  correctOption?: Option;
  createdAt: string;
}

// YouTube URL'den video ID çıkar
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export default function BackofficePage() {
  // --- AUTH ---
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // --- DATA ---
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(false);

  // --- FORM ---
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // --- IMPORT ---
  const [importing, setImporting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [importResult, setImportResult] = useState<any>(null);

  // --- STATS ---
  const memeCount = memes.length;
  const uniqueAnswers = new Set(memes.map((m) => m.correctOption?.text)).size;

  // Video preview
  const videoId = extractVideoId(youtubeUrl);

  // Fetch memes
  const fetchMemes = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/memes", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setMemes(await res.json());
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    if (isAuthenticated) fetchMemes();
  }, [isAuthenticated, fetchMemes]);

  // Login — server-side validation
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      // Test auth by calling the API
      const res = await fetch("/api/admin/memes", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setLoginError("Hatalı şifre!");
      }
    } catch {
      setLoginError("Sunucu hatası.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Add meme — tek adım
  const handleAddMeme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");

    if (!youtubeUrl || !startTime || !endTime || !correctAnswer) {
      return alert("Tüm alanları doldur!");
    }

    if (!videoId) {
      return alert("Geçersiz YouTube URL'si!");
    }

    const start = Number(startTime);
    const end = Number(endTime);
    if (isNaN(start) || isNaN(end) || start >= end) {
      return alert("Zaman aralığı geçersiz!");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/memes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          startTime: start,
          endTime: end,
          correctAnswer: correctAnswer.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setYoutubeUrl("");
        setStartTime("");
        setEndTime("");
        setCorrectAnswer("");
        setSuccessMsg(
          `✅ "${created.correctOption?.text}" eklendi!`
        );
        fetchMemes();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const data = await res.json();
        alert(`Hata: ${data.error}`);
      }
    } catch {
      alert("Sunucu hatası!");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete meme
  const handleDeleteMeme = async (id: string) => {
    if (!window.confirm("Bu meme'i silmek istediğinden emin misin?")) return;

    const res = await fetch(`/api/admin/memes?id=${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });

    if (res.ok) fetchMemes();
    else alert("Silinemedi!");
  };

  // Google Sheets import
  const handleImportSheets = async () => {
    if (!window.confirm("Google Sheets'ten tüm yeni meme'ler aktarılacak. Devam?")) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/import-sheets", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      setImportResult(data);
      if (data.imported > 0) fetchMemes();
    } catch {
      setImportResult({ error: "Bağlantı hatası!" });
    } finally {
      setImporting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isAuthenticated) {
    return (
      <main className="admin-page">
        <div className="admin-login-box">
          <h1 className="admin-login-title">🔐 Admin Paneli</h1>
          <p className="admin-login-desc">
            Meme yönetim paneline erişmek için şifre girin.
          </p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="password"
              className="admin-input"
              placeholder="Admin şifresi..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loginLoading || !password}
            >
              {loginLoading ? "Kontrol ediliyor..." : "Giriş Yap"}
            </button>
          </form>
          {loginError && <p className="admin-error-text">{loginError}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-layout">
        {/* --- HEADER --- */}
        <header className="admin-header">
          <div>
            <h1 className="admin-page-title">Meme Guesser — Admin</h1>
            <p className="admin-page-subtitle">
              Meme ekle, yönet, sil. Her soru 1 doğru cevaba sahip.
            </p>
          </div>
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-value">{memeCount}</span>
              <span className="admin-stat-label">Meme</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{uniqueAnswers}</span>
              <span className="admin-stat-label">Şık</span>
            </div>
          </div>
        </header>

        {/* --- GOOGLE SHEETS İMPORT --- */}
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">📊 Google Sheets İçe Aktar</h2>
              <p style={{ fontSize: "0.8rem", color: "#888", margin: "4px 0 0" }}>
                Takımın sheets&apos;e eklediği meme&apos;ler otomatik çekilir. Duplikatlar atlanır.
              </p>
            </div>
            <button
              onClick={handleImportSheets}
              className="admin-btn admin-btn-primary"
              disabled={importing}
              style={{ minWidth: "140px" }}
            >
              {importing ? "Aktarılıyor..." : "Sheets'ten Çek"}
            </button>
          </div>

          {importResult && (
            <div style={{ marginTop: "1rem" }}>
              {importResult.error && !importResult.success ? (
                <div className="admin-error-text">{importResult.error}</div>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                    <span style={{ color: "#22c55e", fontWeight: "bold" }}>
                      ✅ {importResult.imported} aktarıldı
                    </span>
                    <span style={{ color: "#888" }}>
                      ⏭ {importResult.skipped} atlandı
                    </span>
                  </div>
                  {importResult.details?.length > 0 && (
                    <div style={{ maxHeight: "200px", overflow: "auto", fontSize: "0.8rem" }}>
                      {importResult.details.map((d: { name: string; status: string; reason?: string }, i: number) => (
                        <div key={i} style={{ 
                          padding: "4px 8px", 
                          borderBottom: "1px solid #222",
                          color: d.status === "imported" ? "#22c55e" : d.status === "skipped" ? "#888" : "#ef4444"
                        }}>
                          {d.status === "imported" ? "✅" : d.status === "skipped" ? "⏭" : "❌"} {d.name}
                          {d.reason && <span style={{ color: "#666", marginLeft: "8px" }}>({d.reason})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* --- MEME EKLEME FORMU --- */}
        <section className="admin-card">
          <h2 className="admin-card-title">Yeni Meme Ekle</h2>

          <form onSubmit={handleAddMeme} className="admin-meme-form">
            <div className="admin-form-row">
              <div className="admin-form-group admin-form-group-wide">
                <label className="admin-label">YouTube URL</label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="https://youtube.com/watch?v=... veya video ID"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              </div>
            </div>

            {/* YouTube Önizleme */}
            {videoId && (
              <div className="admin-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt="Video önizleme"
                  className="admin-preview-thumb"
                />
                <span className="admin-preview-id">{videoId}</span>
              </div>
            )}

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Başlangıç (saniye)</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Bitiş (saniye)</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  placeholder="10"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div className="admin-form-group admin-form-group-wide">
                <label className="admin-label">Doğru Cevap</label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder='Örn: "Yazık Kafana", "Rickroll"...'
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-full"
              disabled={submitting}
            >
              {submitting ? "Ekleniyor..." : "Meme Ekle"}
            </button>

            {successMsg && (
              <div className="admin-success-toast">{successMsg}</div>
            )}
          </form>
        </section>

        {/* --- MEME LİSTESİ --- */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              Kayıtlı Memeler ({memeCount})
            </h2>
            <button
              onClick={fetchMemes}
              className="admin-btn admin-btn-ghost"
              disabled={loading}
            >
              {loading ? "Yükleniyor..." : "Yenile ↻"}
            </button>
          </div>

          {memes.length === 0 ? (
            <div className="admin-empty">
              <p>Henüz meme eklenmemiş. Yukarıdaki formu kullan!</p>
            </div>
          ) : (
            <div className="admin-meme-grid">
              {memes.map((meme) => {
                const vid = extractVideoId(meme.youtubeUrl);
                return (
                  <div key={meme.id} className="admin-meme-item">
                    <div className="admin-meme-item-thumb">
                      {vid && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                          alt={meme.correctOption?.text || "Meme"}
                        />
                      )}
                    </div>
                    <div className="admin-meme-item-info">
                      <div className="admin-meme-answer">
                        {meme.correctOption?.text || "—"}
                      </div>
                      <div className="admin-meme-meta">
                        {meme.startTime}s — {meme.endTime}s
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeme(meme.id)}
                      className="admin-btn admin-btn-danger"
                      title="Sil"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}