import { useEffect } from "react";
import { useMeta } from "../context/MetaContext";

const TONE_STYLE = {
  good:    { border: "rgba(16,185,129,0.35)",  bg: "rgba(16,185,129,0.08)",  color: "#10b981" },
  bad:     { border: "rgba(239,68,68,0.35)",   bg: "rgba(239,68,68,0.08)",   color: "#ef4444" },
  neutral: { border: "var(--color-border)",    bg: "transparent",            color: "var(--color-text-secondary)" },
  big:     { border: "rgba(245,158,11,0.45)",  bg: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))", color: "#f59e0b" },
} as const;

export default function NewsfeedPage() {
  const { news, markAllNewsRead, unreadNewsCount } = useMeta();

  useEffect(() => {
    const t = setTimeout(() => markAllNewsRead(), 1500);
    return () => clearTimeout(t);
  }, [markAllNewsRead]);

  const sorted = [...news].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>📰 Manchetes</h1>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {news.length} notícias · {unreadNewsCount} não lidas
        </span>
      </div>

      {sorted.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          Nenhuma manchete ainda. Jogue partidas para gerar notícias!
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map(n => {
          const s = TONE_STYLE[n.tone];
          return (
            <div key={n.id} style={{
              padding: "14px 18px",
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderLeft: `4px solid ${s.color}`,
              borderRadius: 8,
              display: "flex", gap: 14, alignItems: "flex-start",
              opacity: n.read ? 0.7 : 1,
            }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{n.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: n.tone === "big" ? 16 : 14, fontWeight: n.tone === "big" ? 900 : 700,
                  color: n.tone === "big" ? s.color : "var(--color-text-primary)",
                  lineHeight: 1.3,
                }}>
                  {n.headline}
                </div>
                {n.body && (
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                  {n.date}{!n.read && <span style={{ marginLeft: 8, color: "#f59e0b", fontWeight: 800 }}>● NOVO</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
