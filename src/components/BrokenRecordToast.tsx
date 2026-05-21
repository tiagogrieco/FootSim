import { useEffect, useState } from "react";
import { useHallOfFame } from "../context/HallOfFameContext";

export default function BrokenRecordToast() {
  const { brokenRecordToast, dismissBrokenToast } = useHallOfFame();
  const [visible, setVisible] = useState(false);
  const current = brokenRecordToast[0];

  useEffect(() => {
    if (!current) {
      const id = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setVisible(true), 0);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(dismissBrokenToast, 350);
    }, 4000);
    return () => { clearTimeout(id); clearTimeout(t); };
  }, [current, dismissBrokenToast]);

  if (!current) return null;

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(dismissBrokenToast, 250); }}
      style={{
        position: "fixed",
        top: visible ? 90 : -200, right: 24,
        zIndex: 9996,
        background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
        border: "2px solid #c4b5fd",
        borderRadius: 14, padding: "12px 18px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(124,58,237,0.55)",
        transition: "top 0.45s cubic-bezier(.2,1.5,.4,1)",
        cursor: "pointer", minWidth: 320,
      }}
    >
      <div style={{ fontSize: 36, filter: "drop-shadow(0 0 8px #ddd6fe)" }}>{current.icon}</div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.5, color: "#ede9fe", opacity: 0.85 }}>
          🏛️ RECORDE QUEBRADO!
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{current.label}</div>
        <div style={{ fontSize: 11, color: "#ddd6fe" }}>{current.detail}</div>
      </div>
    </div>
  );
}
