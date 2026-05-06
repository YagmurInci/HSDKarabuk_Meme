"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardItem } from "@/app/lib/types";

// ============================================
// LEADERBOARD COMPONENTİ - NESLİHAN'IN ÇALIŞMA ALANI
// Branch: feature/leaderboard
// Görev dosyası: docs/prompts/NESLIHAN_LEADERBOARD.md
// ============================================

interface LeaderboardProps {
  compact?: boolean; // Ana sayfadaki küçük versiyon için
}

export default function Leaderboard({ compact = false }: LeaderboardProps) {
  // --- NESLİHAN: State Tanımları ---
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // --- NESLİHAN: Veri Çekme (Fetch) Fonksiyonu ---
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      
      // Compact ise 5, değilse 20 kişi çekiyoruz
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

  // --- NESLİHAN: Auto-Refresh ve İlk Yükleme ---
  useEffect(() => {
    fetchLeaderboard();

    // Opsiyonel: 30 saniyede bir güncelle
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return (
    <div id="leaderboard-component" className={`leaderboard-component ${compact ? "leaderboard-compact" : "leaderboard-full"}`}>
      <h2 className="leaderboard-title">
        {compact ? "En İyi Oyuncular" : "🏆 Liderlik Tablosu"}
      </h2>

      {/* --- NESLİHAN: Loading State --- */}
      {loading && data.length === 0 && (
        <div id="leaderboard-loading" className="leaderboard-loading">
          Yükleniyor...
        </div>
      )}

      {/* --- NESLİHAN: Error State --- */}
      {error && (
        <div id="leaderboard-error" className="leaderboard-error">
          <p>Skorlar yüklenirken hata oluştu.</p>
          <button onClick={fetchLeaderboard} style={{ marginTop: "10px", cursor: "pointer" }}>
            Tekrar Dene 🔄
          </button>
        </div>
      )}

      {/* --- NESLİHAN: Dinamik Liste --- */}
      {!loading && !error && (
        <ul id="leaderboard-list" className="leaderboard-list">
          {data.map((item) => (
            <li key={item.rank} className="leaderboard-item" id={`leaderboard-item-${item.rank}`}>
              <span className="leaderboard-rank">{item.rank}</span>
              <span className="leaderboard-username">{item.username}</span>
              <span className="leaderboard-score">{item.score.toLocaleString()}</span>
              {!compact && (
                <span className="leaderboard-correct" style={{ marginLeft: "10px", opacity: 0.8 }}>
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