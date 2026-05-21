import { useMeta } from "../context/MetaContext";
import { xpProgress } from "../engine/metaEngine";

export default function MetaHUD() {
  const { profile, unreadNewsCount, challenges } = useMeta();
  const prog = xpProgress(profile.xp);
  const pendingChallenges = challenges.filter(c => !c.done).length;

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <div style={styles.levelBadge}>
          <span style={styles.lvLabel}>LV</span>
          <span style={styles.lvNum}>{profile.level}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.topLine}>
            <span style={styles.title}>{profile.name}</span>
            <span style={styles.xpText}>{prog.current}/{prog.needed}</span>
          </div>
          <div style={styles.track}>
            <div style={{ ...styles.fill, width: `${prog.percent}%` }} />
          </div>
        </div>
      </div>
      <div style={styles.metaStats}>
        <span style={styles.metaPill} title="Notícias não lidas">
          📰 {unreadNewsCount}
        </span>
        <span style={styles.metaPill} title="Desafios diários pendentes">
          🎯 {pendingChallenges}/{challenges.length}
        </span>
        <span style={styles.metaPillAccent} title="Troféus">
          🏆 {profile.trophiesWon}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: "10px 14px",
    borderBottom: "1px solid var(--color-border)",
    background: "linear-gradient(180deg, rgba(245,158,11,0.06), transparent)",
    display: "flex", flexDirection: "column", gap: 8,
  },
  row: { display: "flex", alignItems: "center", gap: 10 },
  levelBadge: {
    width: 36, height: 36, flexShrink: 0,
    borderRadius: 8,
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
    color: "#fff",
  },
  lvLabel: { fontSize: 7, fontWeight: 800, letterSpacing: 1, opacity: 0.85, lineHeight: 1 },
  lvNum: { fontSize: 16, fontWeight: 900, lineHeight: 1 },
  topLine: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    marginBottom: 4,
  },
  title: {
    fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)",
    textTransform: "uppercase", letterSpacing: 0.5,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  xpText: { fontSize: 9, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" },
  track: {
    height: 5, borderRadius: 3, overflow: "hidden",
    background: "var(--color-bg-tertiary, #243044)",
  },
  fill: {
    height: "100%",
    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
    borderRadius: 3, transition: "width 0.5s ease",
    boxShadow: "0 0 8px rgba(245,158,11,0.5)",
  },
  metaStats: { display: "flex", gap: 4, justifyContent: "space-between" },
  metaPill: {
    flex: 1, textAlign: "center",
    fontSize: 10, fontWeight: 700,
    padding: "3px 6px", borderRadius: 4,
    background: "rgba(255,255,255,0.04)",
    color: "var(--color-text-secondary)",
  },
  metaPillAccent: {
    flex: 1, textAlign: "center",
    fontSize: 10, fontWeight: 700,
    padding: "3px 6px", borderRadius: 4,
    background: "rgba(245,158,11,0.12)",
    color: "#f59e0b",
  },
};
