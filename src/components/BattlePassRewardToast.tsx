import { useEffect, useState } from "react";
import { useBattlePass } from "../context/BattlePassContext";

export default function BattlePassRewardToast() {
  const { rewardToast, dismissRewardToast } = useBattlePass();
  const [visible, setVisible] = useState(false);
  const current = rewardToast[0];

  useEffect(() => {
    if (!current) {
      const id = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setVisible(true), 0);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(dismissRewardToast, 350);
    }, 3500);
    return () => { clearTimeout(id); clearTimeout(t); };
  }, [current, dismissRewardToast]);

  if (!current) return null;

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(dismissRewardToast, 250); }}
      style={{
        position: "fixed", bottom: visible ? 28 : -200, left: "50%",
        transform: "translateX(-50%)", zIndex: 9997,
        background: "linear-gradient(135deg, #f59e0b, #d97706)",
        border: "2px solid #fbbf24", borderRadius: 14,
        padding: "12px 20px", display: "flex", alignItems: "center", gap: 12,
        boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,11,0.55)",
        transition: "bottom 0.45s cubic-bezier(.2,1.5,.4,1)",
        cursor: "pointer", minWidth: 280,
      }}
    >
      <div style={{ fontSize: 38, filter: "drop-shadow(0 0 8px #fff)" }}>{current.icon}</div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.5, color: "#fffbeb", opacity: 0.9 }}>
          🎟️ RECOMPENSA BATTLE PASS
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{current.label}</div>
      </div>
    </div>
  );
}
