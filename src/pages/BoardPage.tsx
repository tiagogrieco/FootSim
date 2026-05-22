import { useBoard } from "../context/BoardContext";
import type { BoardObjective, BoardConfidence } from "../types/board";

const PRIORITY_STYLE = {
  primary:   { color: "#ef4444", label: "Principal" },
  secondary: { color: "#f59e0b", label: "Secundária" },
  stretch:   { color: "#3b82f6", label: "Bônus" },
} as const;

const STATUS_STYLE = {
  pending:  { color: "#8b9bb4", icon: "⏳", label: "Em andamento" },
  achieved: { color: "#10b981", icon: "✅", label: "CUMPRIDA" },
  failed:   { color: "#ef4444", icon: "❌", label: "FALHOU" },
} as const;

const CONFIDENCE_STYLE: Record<BoardConfidence["label"], { color: string; label: string; icon: string }> = {
  trust:     { color: "#10b981", label: "Total confiança",    icon: "🤝" },
  neutral:   { color: "#3b82f6", label: "Posição estável",    icon: "😐" },
  concerned: { color: "#f59e0b", label: "Preocupação",        icon: "🤔" },
  critical:  { color: "#ef4444", label: "Situação CRÍTICA",   icon: "⚠️" },
  sacking:   { color: "#7f1d1d", label: "DEMISSÃO IMINENTE",  icon: "🚨" },
};

export default function BoardPage() {
  const { objectives, confidence, pressHistory, sackingThreshold } = useBoard();
  const cs = CONFIDENCE_STYLE[confidence.label];

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>👔 Diretoria</h1>

      {/* Confidence Bar */}
      <div className="card" style={{
        padding: 20, marginBottom: 20,
        background: `linear-gradient(135deg, ${cs.color}15, transparent)`,
        border: `1px solid ${cs.color}40`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 40 }}>{cs.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: cs.color, textTransform: "uppercase" }}>
              Confiança da Diretoria
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: cs.color }}>{cs.label}</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: cs.color, fontFamily: "var(--font-mono)" }}>
            {confidence.value}
          </div>
        </div>
        <div style={{ height: 8, background: "var(--color-bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${confidence.value}%`,
            background: `linear-gradient(90deg, ${cs.color}, ${cs.color}cc)`,
            transition: "width 0.6s ease",
            boxShadow: `0 0 10px ${cs.color}66`,
          }} />
        </div>
        {(confidence.label === "sacking" || confidence.label === "critical") && confidence.sackingRounds > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#fca5a5", fontWeight: 700 }}>
            ⚠️ A diretoria está analisando sua saída. 
            Rodadas consecutivas com confiança zerada: <strong>{confidence.sackingRounds}/{sackingThreshold}</strong>
            {confidence.sackingRounds >= sackingThreshold - 1 && (
              <span style={{ display: "block", marginTop: 4, color: "#ef4444" }}>
                🚨 PRÓXIMA RODADA PODE SER A ÚLTIMA!
              </span>
            )}
          </div>
        )}
      </div>

      {/* Objectives */}
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>📋 Metas da Temporada</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {objectives.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--color-text-muted)" }}>
            Metas serão definidas no início da temporada.
          </div>
        )}
        {objectives.map(o => <ObjectiveCard key={o.id} obj={o} />)}
      </div>

      {/* Confidence history */}
      {confidence.history.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>📈 Histórico de Confiança</h2>
          <div className="card" style={{ padding: 14, marginBottom: 24 }}>
            {confidence.history.slice(-8).reverse().map((h, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{h.reason}</span>
                <span style={{
                  fontSize: 12, fontWeight: 800,
                  color: h.delta > 0 ? "#10b981" : h.delta < 0 ? "#ef4444" : "var(--color-text-muted)",
                }}>
                  {h.delta > 0 ? `+${h.delta}` : h.delta}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Press history */}
      {pressHistory.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>🎙️ Coletivas Recentes</h2>
          <div className="card" style={{ padding: 14 }}>
            {pressHistory.slice(-6).reverse().map((p, i) => (
              <div key={i} style={{
                padding: "10px 0",
                borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                  📰 {p.headline}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 }}>
                  P: "{p.question}"
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3, fontStyle: "italic" }}>
                  R: "{p.chosen}"
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ObjectiveCard({ obj }: { obj: BoardObjective }) {
  const ps = PRIORITY_STYLE[obj.priority];
  const ss = STATUS_STYLE[obj.status];
  const isLeagueObj = obj.type === "league_top" || obj.type === "avoid_relegation";
  let pct: number;
  let progressText: string;
  if (isLeagueObj && obj.progress > 0) {
    const meeting = obj.type === "league_top" ? obj.progress <= obj.target : obj.progress <= obj.target;
    pct = meeting ? 100 : 30;
    progressText = `Atualmente em ${obj.progress}º (meta: ${obj.type === "league_top" ? `≤${obj.target}º` : `acima do ${obj.target}º`})`;
  } else {
    pct = Math.min(100, (obj.progress / obj.target) * 100);
    progressText = `${obj.progress}/${obj.target}`;
  }
  const onTrack = isLeagueObj && obj.progress > 0 && obj.progress <= obj.target;

  return (
    <div className="card" style={{
      padding: 14, display: "flex", gap: 14, alignItems: "center",
      borderLeft: `3px solid ${ps.color}`,
      background: obj.status === "achieved"
        ? "linear-gradient(135deg, rgba(16,185,129,0.1), transparent)"
        : obj.status === "failed"
          ? "linear-gradient(135deg, rgba(239,68,68,0.1), transparent)"
          : "var(--color-bg-card)",
    }}>
      <div style={{ fontSize: 32, width: 48, textAlign: "center" }}>{obj.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
          <span style={{
            fontSize: 8, fontWeight: 800, letterSpacing: 0.5,
            color: ps.color, background: `${ps.color}22`,
            padding: "2px 6px", borderRadius: 3, textTransform: "uppercase",
          }}>{ps.label}</span>
          <span style={{ fontSize: 9, color: ss.color, fontWeight: 700 }}>{ss.icon} {ss.label}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
          {obj.description}
        </div>
        <div style={{ height: 4, background: "var(--color-bg-tertiary)", borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: obj.status === "achieved" ? "#10b981" : onTrack ? "#10b981" : ps.color,
            transition: "width 0.6s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
            {progressText}
          </span>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>
            R$ {(obj.reward / 1_000_000).toFixed(1)}M + {obj.xpReward} XP
          </span>
        </div>
      </div>
    </div>
  );
}
