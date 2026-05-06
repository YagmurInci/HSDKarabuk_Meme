/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  GameStartResponse,
  MemeForClient,
  GameSubmitResponse,
  PlayerAnswer,
} from "@/app/lib/types";
import "./play.css";

// ============================================
// OYUN AKIŞI:
// 1. Meme thumbnail gösterilir → Timer BAŞLAR
// 2. Oyuncu şık seçer → "Cevapla" basar → Timer DURUR
// 3. Doğru/yanlış feedback + meme videosu oynar (süre sayılmaz)
// 4. "Devam Et" → Sonraki soru → Timer yeniden başlar
// 5. 10 soru sonunda submit
//
// Süre Hesabı: SADECE soru ekranındaki düşünme süresi.
// Video izleme süresi hesaba KATILMAZ.
// ============================================

type GamePhase = "loading" | "question" | "answered" | "video" | "result" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function PlayPage() {
  // --- State ---
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [memes, setMemes] = useState<MemeForClient[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [username, setUsername] = useState<string>("Oyuncu");
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitResult, setSubmitResult] = useState<GameSubmitResponse | null>(null);

  // --- Zamanlama (sadece düşünme süresi) ---
  const [totalThinkMs, setTotalThinkMs] = useState(0); // toplam düşünme süresi
  const questionStartRef = useRef<number>(0); // bu sorunun başlangıç timestamp'i
  const isTimerActiveRef = useRef(false);
  const [displayMs, setDisplayMs] = useState(0); // gösterge için

  // --- YouTube ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Derived ---
  const currentMeme = memes[currentIndex];
  const isLastQuestion = currentIndex + 1 === memes.length;

  // ★ currentIndex ref — setTimeout closure'larında stale olmaz
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Username yükle
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meme_guesser_username");
      if (stored) setUsername(stored);
    }
  }, []);

  // Müzik kontrolü
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (phase === "question") {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [phase]);

  // Display timer (60fps visual update)
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (isTimerActiveRef.current) {
        const now = performance.now();
        const elapsed = now - questionStartRef.current;
        setDisplayMs(totalThinkMs + elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalThinkMs]);

  const formatTimer = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  };

  // Timer kontrol fonksiyonları
  const startQuestionTimer = useCallback(() => {
    questionStartRef.current = performance.now();
    isTimerActiveRef.current = true;
  }, []);

  const stopQuestionTimer = useCallback(() => {
    if (isTimerActiveRef.current) {
      const elapsed = performance.now() - questionStartRef.current;
      setTotalThinkMs((prev) => prev + elapsed);
      isTimerActiveRef.current = false;
    }
  }, []);

  // YouTube API yükle
  useEffect(() => {
    if (typeof window !== "undefined" && !window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = () => {};
      document.head.appendChild(tag);
    }
  }, []);

  const getVideoId = (url: string): string | null => {
    try {
      if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
      const urlObj = new URL(url);
      if (urlObj.hostname === "youtu.be") return urlObj.pathname.slice(1);
      return urlObj.searchParams.get("v");
    } catch {
      return null;
    }
  };

  const initYouTubePlayer = useCallback(
    (videoId: string, start: number, end: number) => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player("yt-player", {
          videoId,
          playerVars: {
            autoplay: 1,
            start,
            end,
            controls: 0,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (e: { target: { mute: () => void; playVideo: () => void } }) => {
              if (isMuted) e.target.mute();
              e.target.playVideo();
            },
          },
        });
      }
    },
    [isMuted]
  );

  // Oyunu başlat
  useEffect(() => {
    const startGame = async () => {
      try {
        const response = await fetch("/api/game/start", { method: "POST" });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Oyun başlatılamadı.");
        }
        const data: GameStartResponse = await response.json();
        setSessionToken(data.sessionToken);
        setMemes(data.memes);
        setPhase("question");
        // İlk soru timer'ı başlat
        questionStartRef.current = performance.now();
        isTimerActiveRef.current = true;
      } catch (error) {
        console.error("[PlayPage] Oyun başlatma hatası:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Sunucuya bağlanılamadı."
        );
        setPhase("error");
      }
    };
    startGame();
  }, []);

  // Şık seçimi
  const handleSelectOption = (optionId: string) => {
    if (phase !== "question") return;
    setSelectedOptionId(optionId);
  };

  // ★ answersRef — React state async olduğu için ref ile anlık takip
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // ★ Feedback → video geçişi timeout ref (iptal edilebilir)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cevapla butonu
  const handleSubmitAnswer = () => {
    if (!selectedOptionId || !currentMeme) return;

    // Timer'ı DURDUR (video süresi sayılmayacak)
    stopQuestionTimer();

    // Cevabı kaydet
    const newAnswer = { memeId: currentMeme.id, selectedOptionId };
    setAnswers((prev) => {
      const updated = [...prev, newAnswer];
      answersRef.current = updated; // ★ Ref'i de güncelle
      return updated;
    });

    // "answered" fazına geç — feedback göster
    setPhase("answered");

    // ★ Önceki timeout varsa temizle
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // 1.5 saniye feedback göster, sonra videoya geç
    // ★ Hangi sorudayız kaydet — timeout geldiğinde hâlâ aynı sorudaysak video başlat
    const questionIndex = currentIndex;
    feedbackTimeoutRef.current = setTimeout(() => {
      // ★ Guard: Kullanıcı "Devam Et"e basmışsa currentIndexRef değişmiş olur
      if (currentIndexRef.current !== questionIndex) return;
      setPhase("video");
      const videoId = getVideoId(currentMeme.youtubeUrl);
      if (videoId) {
        setTimeout(() => {
          initYouTubePlayer(videoId, currentMeme.startTime, currentMeme.endTime);
        }, 100);
      }
    }, 1500);
  };

  // ★ Player'ı güvenli şekilde durdur ve yok et
  const stopAndDestroyPlayer = () => {
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.stopVideo === "function") {
          playerRef.current.stopVideo();
        }
        if (typeof playerRef.current.destroy === "function") {
          playerRef.current.destroy();
        }
      } catch {
        // Player zaten yok edilmiş olabilir
      }
      playerRef.current = null;
    }
  };

  // Devam Et / Sonraki
  const handleNext = async () => {
    // ★ Feedback timeout'u iptal et (video bleed engeli)
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    // ★ YouTube player'ı KESİNLİKLE durdur ve yok et
    stopAndDestroyPlayer();

    if (currentIndex + 1 < memes.length) {
      // Sonraki soruya geç
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setPhase("question");
      // Timer'ı yeniden başlat
      startQuestionTimer();
    } else {
      // Son soru — sonuçları gönder
      setPhase("loading");
      const playerName =
        localStorage.getItem("meme_guesser_username") || "Oyuncu";

      // ★ answersRef kullan — state async olduğu için stale olabilir
      const finalAnswers = answersRef.current;

      try {
        const response = await fetch("/api/game/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            username: playerName,
            answers: finalAnswers,
            timeTakenMs: Math.round(totalThinkMs),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Sunucu hatası (${response.status})`);
        }

        const result: GameSubmitResponse = await response.json();
        setSubmitResult(result);
        setPhase("result");
      } catch (error) {
        console.error("[PlayPage] Skor gönderme hatası:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Skor gönderilemedi."
        );
        setPhase("error");
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (playerRef.current?.mute && playerRef.current?.unMute) {
        if (next) playerRef.current.mute();
        else playerRef.current.unMute();
      }
      return next;
    });
  };

  // ============================================
  // RENDER
  // ============================================

  // Error
  if (phase === "error") {
    return (
      <div id="game-layout">
        <div id="game-result">
          <h2 className="result-score-big" style={{ color: "var(--wrong-red)" }}>
            ❌
          </h2>
          <p className="result-subtitle">
            {errorMessage || "Bir hata oluştu."}
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Tekrar Dene
          </button>
          <a href="/login" className="btn-secondary" style={{ marginTop: "0.5rem" }}>
            Ana Sayfa
          </a>
        </div>
      </div>
    );
  }

  // Loading
  if (phase === "loading") {
    return (
      <div id="game-layout">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Sorular hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  // Result
  if (phase === "result") {
    return (
      <div id="game-layout">
        <div id="game-result">
          <h2 className="result-score-big">
            {submitResult?.correctCount}/{submitResult?.totalQuestions}
          </h2>
          <p className="result-subtitle">
            Düşünme süresi: {formatTimer(totalThinkMs)} · Sıralama: #
            {submitResult?.rank}
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Doğru</span>
              <span className="stat-value correct-val">
                {submitResult?.correctCount}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Yanlış</span>
              <span className="stat-value wrong-val">
                {(submitResult?.totalQuestions || 0) -
                  (submitResult?.correctCount || 0)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Düşünme Süresi</span>
              <span className="stat-value">{formatTimer(totalThinkMs)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Puan</span>
              <span className="stat-value score-val">
                {submitResult?.score}
              </span>
            </div>
          </div>

          <div className="mini-leaderboard">
            <div className="leaderboard-row highlight">
              <span
                className={`leaderboard-rank ${submitResult?.rank === 1 ? "rank-1" : ""}`}
              >
                #{submitResult?.rank}
              </span>
              <span className="leaderboard-name">{username}</span>
              <span className="leaderboard-score">{submitResult?.score}</span>
            </div>
          </div>

          <a href="/leaderboard" className="btn-primary">
            Sıralamayı Gör
          </a>
          <button
            className="btn-secondary"
            onClick={() => window.location.reload()}
            style={{ marginTop: "0.5rem" }}
          >
            Tekrar Oyna
          </button>

          {/* Sosyal linkler — premium CTA card */}
          <div className="result-social">
            <p className="result-social-title">🎉 Bize Katıl!</p>
            <p className="result-social-text">
              Kazananlar Instagram hikayemizde paylaşılacak.
              WhatsApp grubumuzda etkinlik duyuruları ve ödüller var!
            </p>
            <div className="result-social-links">
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
                💬 WhatsApp Grubu
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active game (question / answered / video)
  const videoId = getVideoId(currentMeme?.youtubeUrl || "");
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : "";

  const timerPaused = phase !== "question";

  return (
    <div id="game-layout">
      {/* Arka plan müziği */}
      <audio ref={audioRef} src="/bg-music.mp3" loop />

      {/* Üst Bar */}
      <div id="game-header-top">
        <div id="timer-display" className={timerPaused ? "paused" : ""}>
          ⏱ {formatTimer(displayMs)}
        </div>
        <div className="game-actions">
          <button className="action-icon-btn" onClick={toggleMute}>
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button className="action-pill-btn user-hash-btn">
            👤 {username}
          </button>
        </div>
      </div>

      <div className="game-progress-row">
        <span id="question-counter">
          Soru {currentIndex + 1} / {memes.length}
        </span>
        <span className="progress-percent">
          {Math.round(((currentIndex + 1) / memes.length) * 100)}%
        </span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{
            width: `${((currentIndex + (phase === "question" ? 0 : 1)) / memes.length) * 100}%`,
          }}
        />
      </div>

      <div className="game-card">
        <div className="media-container">
          {phase === "question" || phase === "answered" ? (
            thumbnailUrl && (
              <img id="meme-image" src={thumbnailUrl} alt="Meme" />
            )
          ) : (
            <div id="yt-player" />
          )}
        </div>

        <div className="game-card-body">
          {phase === "question" && (
            <h2 className="question-title">Bu meme&apos;i biliyor musun?</h2>
          )}

          {phase === "answered" && currentMeme && (
            <div className={`feedback-alert ${
              selectedOptionId === currentMeme.correctOptionId ? "feedback-correct" : "feedback-incorrect"
            }`}>
              {selectedOptionId === currentMeme.correctOptionId
                ? "✅ Doğru bildin! Video geliyor..."
                : "❌ Yanlış! Doğru cevap gösterildi."}
            </div>
          )}

          {phase === "video" && (
            <div className="feedback-alert video-playing">
              🎬 Meme&apos;i tanı — sonra devam et!
            </div>
          )}

          <div id="options-container">
            {currentMeme?.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isLocked = phase === "answered" || phase === "video";
              const isCorrect = option.id === currentMeme.correctOptionId;
              let btnClass = "option-btn";

              if (isLocked) {
                // Cevap kilitlendikten sonra doğru/yanlış göster
                if (isCorrect) btnClass += " correct";
                if (isSelected && !isCorrect) btnClass += " incorrect";
                if (isSelected) btnClass += " selected";
              } else {
                if (isSelected) btnClass += " selected";
              }

              return (
                <button
                  key={option.id}
                  className={btnClass}
                  data-option-id={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  disabled={phase !== "question"}
                >
                  {isLocked && isCorrect && (
                    <span className="check-icon">✓</span>
                  )}
                  {isLocked && isSelected && !isCorrect && (
                    <span className="cross-icon">✗</span>
                  )}
                  {option.text}
                </button>
              );
            })}
          </div>

          <div className="card-footer">
            {phase === "question" && (
              <button
                id="submit-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={!selectedOptionId}
              >
                Cevapla
              </button>
            )}
            {(phase === "answered" || phase === "video") && (
              <button id="next-btn" onClick={handleNext}>
                {isLastQuestion ? "Sonuçları Gör" : "Devam Et →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
