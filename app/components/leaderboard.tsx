"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardItem } from "@/app/lib/types";

// ============================================
// LEADERBOARD COMPONENTİ
// Branch: feature/leaderboard
// Stand etkinliği: 3 saatte bir sıfırlanır, geri sayım gösterilir
// ============================================

interface LeaderboardProps {
  compact?: boolean;
}

// Sonraki 3-saatlik periyodun başlangıcını hesapla
function getNextResetTime(): Date {
  const now = new Date();
  const hours = now.getHours();
  const nextReset = new Date(now);
  nextReset.setMinutes(0, 0, 0);
  nextReset.setHours(Math.ceil((hours + 1) / 3) * 3);
  if (nextReset <= now) {
    nextReset.setHours(nextReset.getHours() + 3);
  }
  return nextReset;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Sıfırlanıyor...";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}sa ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

export default function Leaderboard({ compact = false }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const limit = compact ? 5 : 20;
      const response = await fetch(`/api/leaderboard?limit=${limit}`);
      if (!response.ok) throw new Error("Veri çekilemedi");
      const result: LeaderboardItem[] = await response.json();
      setData(result);
    } catch (err) {
      console.error("Leaderboard Hatası:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [compact]);

  useEffect(() => {
    fetchLeaderboard();
    // Stand etkinliği: 15 saniyede bir güncelle (çok kişi oynayacak)
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Geri sayım
  useEffect(() => {
    const tick = () => {
      const next = getNextResetTime();
      const remaining = next.getTime() - Date.now();
      setCountdown(formatCountdown(remaining));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="leaderboard-component"
      className={`leaderboard-component ${compact ? "leaderboard-compact" : "leaderboard-full"}`}
    >
      <h2 className="leaderboard-title">
        {compact ? "En İyi Oyuncular" : "🏆 Liderlik Tablosu"}
      </h2>

      {/* Sıfırlama geri sayımı */}
      {!compact && (
        <div className="leaderboard-countdown">
          ⏳ Sıfırlamaya kalan: <strong>{countdown}</strong>
        </div>
      )}

      {/* Loading */}
      {loading && data.length === 0 && (
        <div id="leaderboard-loading" className="leaderboard-loading">
          Yükleniyor...
        </div>
      )}

      {/* Error */}
      {error && (
        <div id="leaderboard-error" className="leaderboard-error">
          <p>Skorlar yüklenirken hata oluştu.</p>
          <button onClick={fetchLeaderboard}>Tekrar Dene 🔄</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && data.length === 0 && (
        <div className="leaderboard-empty">
          Henüz kimse oynamadı. İlk sen ol! 🎮
        </div>
      )}

      {/* Liste */}
      {!loading && !error && data.length > 0 && (
        <ul id="leaderboard-list" className="leaderboard-list">
          {data.map((item) => (
            <li
              key={item.rank}
              className="leaderboard-item"
              id={`leaderboard-item-${item.rank}`}
            >
              <span className="leaderboard-rank">{item.rank}</span>
              <span className="leaderboard-username">{item.username}</span>
              <span className="leaderboard-score">
                {item.score.toLocaleString()}
              </span>
              {!compact && (
                <span className="leaderboard-correct">
                  🎯 {item.correctCount}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}