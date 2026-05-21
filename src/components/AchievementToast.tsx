import { useEffect, useState } from "react";
import { useMeta } from "../context/MetaContext";

const TIER_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  bronze:   { bg: "linear-gradient(135deg, #92400e, #78350f)", border: "#cd7f32", color: "#fcd34d" },
  silver:   { bg: "linear-gradient(135deg, #475569, #334155)", border: "#cbd5e1", color: "#f1f5f9" },
  gold:     { bg: "linear-gradient(135deg, #ca8a04, #a16207)", border: "#fcd34d", color: "#fef3c7" },
  platinum: { bg: "linear-gradient(135deg, #4c1d95, #1e1b4b)", border: "#a78bfa", color: "#ede9fe" },
};

export default function AchievementToast() {
  const { toastQueue, dismissToast } = useMeta();
  const [visible, setVisible] = useState(false);
  const current = toastQueue[0];

  useEffect(() => {
    if (!current) {
      const id = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setVisible(true), 0);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(dismissToast, 350);
    }, 4200);
    return () => { clearTimeout(id); clearTimeout(t); };
  }, [current, dismissToast]);

  if (!current) return null;
  const colors = TIER_COLORS[current.tier];

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: visible ? 24 : -420,
        zIndex: 9998,
        width: 360,
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: `0 10px 40px rgba(0,0,0,0.6), 0 0 30px ${colors.border}44`,
        transition: "right 0.4s cubic-bezier(.2,1.5,.4,1), opacity 0.3s",
        opacity: visible ? 1 : 0,
        cursor: "pointer",
      }}
      onClick={() => { setVisible(false); setTimeout(dismissToast, 300); }}
    >
      <div style={{
        fontSize: 40,
        filter: `drop-shadow(0 0 12px ${colors.border})`,
      }}>
        {current.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 1.5,
          color: colors.color,
          opacity: 0.85,
          textTransform: "uppercase",
        }}>
          Conquista — {current.tier} {current.xp > 0 ? `· +${current.xp} XP` : ""}
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginTop: 2 }}>
          {current.name}
        </div>
        <div style={{ fontSize: 11, color: colors.color, opacity: 0.85, marginTop: 2 }}>
          {current.description}
        </div>
      </div>
    </div>
  );
}
