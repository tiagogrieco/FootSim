import { useToast } from "../hooks/useToast";

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  success:   { bg: "linear-gradient(135deg, #065f46, #064e3b)", border: "#34d399", icon: "✅" },
  error:     { bg: "linear-gradient(135deg, #7f1d1d, #450a0a)", border: "#f87171", icon: "❌" },
  warning:   { bg: "linear-gradient(135deg, #92400e, #78350f)", border: "#fbbf24", icon: "⚠️" },
  info:      { bg: "linear-gradient(135deg, #1e3a5f, #0f172a)", border: "#60a5fa", icon: "ℹ️" },
  match:     { bg: "linear-gradient(135deg, #14532d, #064e3b)", border: "#4ade80", icon: "⚽" },
  transfer:  { bg: "linear-gradient(135deg, #581c87, #3b0764)", border: "#c084fc", icon: "💰" },
  offer:     { bg: "linear-gradient(135deg, #1e40af, #1e3a8a)", border: "#60a5fa", icon: "📨" },
};

export default function GameToast() {
  const { queue, dismiss } = useToast();

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 320,
        pointerEvents: "none",
      }}
    >
      {queue.map((t) => {
        const style = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto",
              background: style.bg,
              border: `1.5px solid ${style.border}`,
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${style.border}33`,
              animation: `toastSlideIn 0.35s cubic-bezier(.2,1.5,.4,1)`,
              opacity: 1,
              transform: `translateY(0)`,
              transition: "opacity 0.3s, transform 0.3s",
            }}
            onClick={() => dismiss(t.id)}
          >
            <div style={{ fontSize: 20, lineHeight: 1 }}>{style.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{t.title}</div>
              {t.message && (
                <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2, lineHeight: 1.4 }}>
                  {t.message}
                </div>
              )}
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: 16,
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
              onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
