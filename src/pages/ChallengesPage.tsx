import { useMeta } from "../context/MetaContext";
import { useGame } from "../context/GameContext";

export default function ChallengesPage() {
  const { challenges, profile } = useMeta();
  const { currentDate } = useGame();

  const done = challenges.filter(c => c.done).length;
  const total = challenges.length;
  const totalXP = challenges.reduce((s, c) => s + (c.done ? c.xpReward : 0), 0);

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>🎯 Desafios Diários</h1>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 24 }}>
        Data do jogo: <strong>{currentDate}</strong> · Renovam ao avançar o dia · Total completos na carreira: <strong>{profile.challengesCompleted}</strong>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 10,
          background: done === total && total > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "var(--color-bg-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 900, color: "#fff",
        }}>
          {done === total && total > 0 ? "✅" : `${done}/${total}`}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Progresso de hoje</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>+{totalXP} XP ganhos hoje · jogue partidas para completar</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {challenges.map(c => {
          const pct = Math.min(100, (c.progress / c.target) * 100);
          return (
            <div key={c.id} className="card" style={{
              padding: 14, display: "flex", alignItems: "center", gap: 14,
              border: `1.5px solid ${c.done ? "rgba(16,185,129,0.5)" : "var(--color-border)"}`,
              background: c.done ? "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))" : "var(--color-bg-card)",
              opacity: c.done ? 1 : 0.95,
            }}>
              <div style={{
                fontSize: 32, width: 50, height: 50,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.2)", borderRadius: 8,
                filter: c.done ? "drop-shadow(0 0 8px rgba(16,185,129,0.6))" : "grayscale(0.3)",
              }}>
                {c.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{c.description}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: c.done ? "#10b981" : "#f59e0b",
                  }}>+{c.xpReward} XP</span>
                </div>
                <div style={{ height: 5, background: "var(--color-bg-tertiary)", borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: c.done ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 3, fontFamily: "var(--font-mono)" }}>
                  {c.progress}/{c.target} {c.done ? "· COMPLETO" : ""}
                </div>
              </div>
            </div>
          );
        })}
        {challenges.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
            Desafios serão sorteados quando o dia mudar.
          </div>
        )}
      </div>
    </div>
  );
}
