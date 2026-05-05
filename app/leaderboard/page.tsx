import Leaderboard from "@/app/components/leaderboard";

export default function LeaderboardPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F0F0F", color: "#fff", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", backgroundColor: "#1A1A1A", borderRadius: "16px", border: "1px solid #2A2A2A" }}>
        <Leaderboard compact={false} />
        
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <a href="/play" style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#7C3AED",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontFamily: "Syne, sans-serif"
          }}>
            ← Oyuna Dön
          </a>
        </div>
      </div>
    </div>
  );
}
