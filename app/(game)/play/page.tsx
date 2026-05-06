/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import type { 
  GameStartResponse, 
  MemeForClient, 
  GameSubmitResponse,
  PlayerAnswer
} from "@/app/lib/types";
import "./play.css";

type GamePhase = "loading" | "question" | "video" | "result" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function PlayPage() {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [memes, setMemes] = useState<MemeForClient[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [submitResult, setSubmitResult] = useState<GameSubmitResponse | null>(null);
  const [username, setUsername] = useState<string>("Oyuncu");
  const [isMuted, setIsMuted] = useState(false);
  const [isReadyToStart, setIsReadyToStart] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
    if (correctAudioRef.current) {
      correctAudioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (phase === "question") {
        audioRef.current.play().catch((err) => console.log("Audio autoplay prevented:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [phase]);

  const formatTimer = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("meme_guesser_username");
      if (storedName) {
        setUsername(storedName);
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedMs((prev) => prev + 100);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    // AŞAMA 1 — Oyun Yükleniyor
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
        setIsReadyToStart(true);
      } catch (error) {
        console.error("[PlayPage] Oyun başlatma hatası:", error);
        setSessionToken("mock-session");
        setMemes(MOCK_MEMES);
        setIsReadyToStart(true);
      }
    };
    startGame();
  }, []);

  const getVideoId = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("v");
    } catch {
      return null;
    }
  };

  // Load YT API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = () => {
        // Ready
      };
      document.head.appendChild(tag);
    }
  }, []);

  const initYouTubePlayer = (videoId: string, start: number, end: number) => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }
    
    if (window.YT && window.YT.Player) {
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: videoId,
        playerVars: { 
          autoplay: 1, 
          start: start, 
          end: end,
          controls: 0,
          rel: 0
        },
        events: { 
          onReady: (e: { target: { mute: () => void; playVideo: () => void } }) => {
            if (isMuted) e.target.mute();
            e.target.playVideo();
          }
        }
      });
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (playerRef.current && playerRef.current.mute && playerRef.current.unMute) {
        if (newMuted) playerRef.current.mute();
        else playerRef.current.unMute();
      }
      return newMuted;
    });
  };

  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId) return;
    
    const currentMeme = memes[currentIndex];

    // Doğru cevap efekti
    if (correctAudioRef.current) {
      correctAudioRef.current.currentTime = 0;
      correctAudioRef.current.play().catch(e => console.log(e));
    }

    setAnswers(prev => [
      ...prev,
      { memeId: currentMeme.id, selectedOptionId: selectedOptionId }
    ]);
    
    // AŞAMA 3 — YouTube Video Ekranı
    setPhase("video");
    setIsTimerRunning(false);
    
    setTimeout(() => {
      const videoId = getVideoId(currentMeme.youtubeUrl);
      if (videoId) {
        initYouTubePlayer(videoId, currentMeme.startTime, currentMeme.endTime);
      }
    }, 100);
  };

  const handleNext = async () => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    if (currentIndex + 1 < memes.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setPhase("question");
      setIsTimerRunning(true);
    } else {
      // AŞAMA 4 — Oyun Sonu
      setPhase("loading");
      const username = localStorage.getItem("meme_guesser_username") || "Oyuncu";
      try {
        const response = await fetch("/api/game/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            username,
            answers: answers,
            timeTakenMs: elapsedMs,
          }),
        });
        
        if (!response.ok) throw new Error("Failed to submit game");
        
        const result: GameSubmitResponse = await response.json();
        setSubmitResult(result);
        setPhase("result");
      } catch (error) {
        console.error("[PlayPage] Skor gönderme hatası:", error);
        setErrorMessage(error instanceof Error ? error.message : "Skor gönderilemedi.");
        setPhase("error");
      }
    }
  };

  if (phase === "error") {
    return (
      <div id="game-container">
        <div id="game-result">
          <h2 className="result-score-big" style={{ color: "var(--error)" }}>❌</h2>
          <p className="result-subtitle">{errorMessage || "Bir hata oluştu."}</p>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: "1rem" }}
          >
            Tekrar Dene
          </button>
          <a href="/" className="btn-primary" style={{ marginTop: "0.5rem", background: "var(--surface)" }}>
            Ana Sayfa
          </a>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div id="game-layout" style={{ justifyContent: "center", alignItems: "center" }}>
        {isReadyToStart ? (
          <button 
            className="btn-primary" 
            style={{ maxWidth: "300px", fontSize: "20px", padding: "20px" }}
            onClick={() => {
              setPhase("question");
              setIsTimerRunning(true);
              // Kullanıcı etkileşimi olduğu için ses artık sorunsuz çalabilir
            }}
          >
            🎮 Oyuna Başla!
          </button>
        ) : (
          <h2 style={{ color: "#fff" }}>Yükleniyor...</h2>
        )}
      </div>
    );
  }

  if (phase === "result") {
    let username = "Oyuncu";
    if (typeof window !== "undefined") {
      username = localStorage.getItem("meme_guesser_username") || "Oyuncu";
    }

    return (
      <div id="game-container">
        <div id="game-result">
          <h2 className="result-score-big">{submitResult?.correctCount}/{submitResult?.totalQuestions}</h2>
          <p className="result-subtitle">Toplam süre: {formatTimer(elapsedMs)} · Sıralama: #{submitResult?.rank}</p>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Doğru</span>
              <span className="stat-value correct-val">{submitResult?.correctCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Yanlış</span>
              <span className="stat-value wrong-val">{(submitResult?.totalQuestions || 0) - (submitResult?.correctCount || 0)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Süre</span>
              <span className="stat-value">{formatTimer(elapsedMs)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Puan</span>
              <span className="stat-value score-val">{submitResult?.score}</span>
            </div>
          </div>

          <div className="mini-leaderboard">
            <div className="leaderboard-row highlight">
              <span className={`leaderboard-rank ${submitResult?.rank === 1 ? 'rank-1' : ''}`}>#{submitResult?.rank}</span>
              <span className="leaderboard-name">{username}</span>
              <span className="leaderboard-score">{submitResult?.score}</span>
            </div>
          </div>
          
          <a href="/leaderboard" className="btn-primary">
            Sıralamayı Gör
          </a>
        </div>
      </div>
    );
  }

  const currentMeme = memes[currentIndex];
  const isLastQuestion = currentIndex + 1 === memes.length;
  
  const videoId = getVideoId(currentMeme?.youtubeUrl || "");
  const imageUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";

  return (
    <div id="game-layout">
      {/* Arka plan müziği */}
      <audio ref={audioRef} src="https://upload.wikimedia.org/wikipedia/commons/3/34/Suspense.ogg" loop />
      <audio ref={correctAudioRef} src="https://upload.wikimedia.org/wikipedia/commons/e/e5/Magical_sound_effect.ogg" />
      
      {/* Üst Bar */}
      <div id="game-header-top">
        <div id="timer-display" className={!isTimerRunning && phase === 'video' ? 'paused' : ''}>
          ⏱ {formatTimer(elapsedMs)}
        </div>
        <div className="game-actions">
          <button className="action-icon-btn" onClick={toggleMute}>
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button className="action-pill-btn">🔀 50:50 (2)</button>
          <button className="action-pill-btn">👁 Göster (1)</button>
          <button className="action-pill-btn user-hash-btn">👤 {username}</button>
        </div>
      </div>

      <div className="game-progress-row">
        <span id="question-counter">Soru {currentIndex + 1} / {memes.length}</span>
        <span className="progress-percent">
          <span className="klasik-badge">Klasik</span>
          5%
        </span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${((currentIndex + 1) / memes.length) * 100}%` }}></div>
      </div>

      <div className="game-card">
        <div className="media-container">
          {phase === "question" ? (
            imageUrl && <img id="meme-image" src={imageUrl} alt="Meme" />
          ) : (
            <div id="yt-player"></div>
          )}
        </div>

        <div className="game-card-body">
          <h2 className="question-title">Bu meme&apos;i biliyor musun?</h2>

          {phase === "video" && (
            <div className="feedback-alert">
              Harika! Bilgi akıyor!
            </div>
          )}

          <div id="options-container">
            {currentMeme?.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isVideoPhase = phase === "video";
              let btnClass = "option-btn";
              if (isSelected) btnClass += " selected";
              if (isVideoPhase && isSelected) btnClass += " correct";
              
              return (
                <button
                  key={option.id}
                  className={btnClass}
                  data-option-id={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  disabled={isVideoPhase || (selectedOptionId !== null && selectedOptionId !== option.id)}
                >
                  {isVideoPhase && isSelected && <span className="check-icon">✓</span>}
                  {option.text}
                </button>
              );
            })}
          </div>

          <div className="card-footer">
            {phase === "question" ? (
              <button 
                id="submit-answer-btn" 
                onClick={handleSubmitAnswer}
                disabled={!selectedOptionId}
              >
                Cevapla
              </button>
            ) : (
              <button 
                id="next-btn" 
                onClick={handleNext}
              >
                {isLastQuestion ? "Sonuçları Gör" : "Sonraki →"}
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
