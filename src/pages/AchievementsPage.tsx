import { useMemo, useState } from "react";
import { useMeta } from "../context/MetaContext";
import { ACHIEVEMENTS } from "../data/achievements";
import { xpProgress } from "../engine/metaEngine";
import type { AchievementTier } from "../types/meta";

const TIER_STYLE: Record<AchievementTier, { bg: string; border: string; color: string; label: string }> = {
  bronze:   { bg: "linear-gradient(135deg, #78350f, #92400e)", border: "#cd7f32", color: "#fcd34d", label: "Bronze" },
  silver:   { bg: "linear-gradient(135deg, #334155, #475569)", border: "#cbd5e1", color: "#f1f5f9", label: "Prata" },
  gold:     { bg: "linear-gradient(135deg, #a16207, #ca8a04)", border: "#fcd34d", color: "#fef3c7", label: "Ouro" },
  platinum: { bg: "linear-gradient(135deg, #1e1b4b, #4c1d95)", border: "#a78bfa", color: "#ede9fe", label: "Platina" },
};

export default function AchievementsPage() {
  const { profile, unlocked } = useMeta();
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked" | AchievementTier>("all");

  const unlockedSet = useMemo(() => new Set(unlocked.map(u => u.id)), [unlocked]);
  const prog = xpProgress(profile.xp);

  const visible = ACHIEVEMENTS.filter(a => {
    const isUnlocked = unlockedSet.has(a.id);
    if (filter === "unlocked") return isUnlocked;
    if (filter === "locked") return !isUnlocked;
    if (filter === "bronze" || filter === "silver" || filter === "gold" || filter === "platinum") return a.tier === filter;
    return true;
  });

  const totalXP = ACHIEVEMENTS.reduce((s, a) => s + a.xp, 0);
  const earnedXP = ACHIEVEMENTS.filter(a => unlockedSet.has(a.id)).reduce((s, a) => s + a.xp, 0);

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 16,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(245,158,11,0.4)",
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 1, opacity: 0.9 }}>NÍVEL</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{profile.level}</span>
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>🏆 Conquistas</h1>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
            {unlocked.length}/{ACHIEVEMENTS.length} desbloqueadas · {earnedXP}/{totalXP} XP de conquistas · {profile.xp} XP total
          </div>
          <div style={{ height: 8, background: "var(--color-bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${prog.percent}%`,
              background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
              boxShadow: "0 0 10px rgba(245,158,11,0.5)",
              transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            {prog.current}/{prog.needed} XP para nível {profile.level + 1}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all","unlocked","locked","bronze","silver","gold","platinum"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: filter === f ? "var(--color-accent-primary)" : "var(--color-bg-card)",
              color: filter === f ? "#fff" : "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5,
              fontFamily: "var(--font-sans)",
            }}>
            {f === "all" ? "Todas" : f === "unlocked" ? "Desbloq." : f === "locked" ? "Bloq." : TIER_STYLE[f].label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {visible.map(a => {
          const isUnlocked = unlockedSet.has(a.id);
          const s = TIER_STYLE[a.tier];
          return (
            <div key={a.id} className="card" style={{
              padding: 14, display: "flex", gap: 12, alignItems: "center",
              opacity: isUnlocked ? 1 : 0.45,
              background: isUnlocked ? s.bg : "var(--color-bg-card)",
              border: `1.5px solid ${isUnlocked ? s.border : "var(--color-border)"}`,
              filter: isUnlocked ? "none" : "grayscale(0.8)",
              transition: "all 0.3s ease",
            }}>
              <div style={{
                fontSize: 36, width: 56, height: 56,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isUnlocked ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.04)",
                borderRadius: 10,
                filter: isUnlocked ? `drop-shadow(0 0 8px ${s.border})` : "none",
              }}>
                {isUnlocked ? a.icon : "🔒"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: 1, opacity: 0.8,
                  color: isUnlocked ? s.color : "var(--color-text-muted)",
                  textTransform: "uppercase",
                }}>
                  {s.label} {a.xp > 0 ? `· +${a.xp} XP` : ""}
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: isUnlocked ? "#fff" : "var(--color-text-secondary)", marginTop: 2 }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 11, color: isUnlocked ? s.color : "var(--color-text-muted)", opacity: 0.85, marginTop: 2 }}>
                  {a.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
