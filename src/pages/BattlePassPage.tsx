import { useRef } from "react";
import { useBattlePass } from "../context/BattlePassContext";
import { BATTLE_PASS_TIERS } from "../data/battlepassTiers";
import { xpToNextTier } from "../engine/battlepassEngine";
import { MAX_TIER } from "../types/battlepass";

export default function BattlePassPage() {
  const { state, currentTier, claimTier, claimAllAvailable } = useBattlePass();
  const prog = xpToNextTier(state.currentXP);
  const trackRef = useRef<HTMLDivElement>(null);

  const claimableCount = BATTLE_PASS_TIERS.filter(
    t => t.tier <= currentTier && !state.claimedTiers.includes(t.tier),
  ).length;

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(124,58,237,0.08))",
        border: "1px solid rgba(245,158,11,0.3)",
        borderRadius: 14, padding: 20, marginBottom: 20,
        display: "flex", alignItems: "center", gap: 20,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 14,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(245,158,11,0.5)",
        }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#fff", opacity: 0.85, letterSpacing: 1 }}>TIER</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{currentTier}</span>
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 2 }}>🎟️ Battle Pass · Temporada {state.season || "—"}</h1>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
            {state.currentXP.toLocaleString("pt-BR")} XP · {claimableCount} recompensa{claimableCount === 1 ? "" : "s"} para coletar
            {state.xpBoostMatches > 0 && <span style={{ color: "#fbbf24", marginLeft: 10, fontWeight: 700 }}>⚡ Boost ×2 ativo ({state.xpBoostMatches} jogos)</span>}
          </div>
          <div style={{ height: 10, background: "var(--color-bg-tertiary)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${prog.percent}%`,
              background: "linear-gradient(90deg, #f59e0b, #fbbf24, #fde047)",
              boxShadow: "0 0 12px rgba(245,158,11,0.7)",
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            {prog.current}/{prog.needed} XP {currentTier < MAX_TIER ? `→ Tier ${currentTier + 1}` : "MÁXIMO"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            padding: "8px 14px", borderRadius: 8,
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: 800, letterSpacing: 1 }}>MOEDAS</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fbbf24" }}>🪙 {state.coins}</div>
          </div>
          <button
            disabled={claimableCount === 0}
            onClick={() => claimAllAvailable()}
            style={{
              padding: "10px 16px", borderRadius: 8,
              border: "none", fontWeight: 900, fontSize: 12,
              cursor: claimableCount > 0 ? "pointer" : "not-allowed",
              background: claimableCount > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "var(--color-bg-card)",
              color: claimableCount > 0 ? "#fff" : "var(--color-text-muted)",
              fontFamily: "var(--font-sans)",
              boxShadow: claimableCount > 0 ? "0 4px 14px rgba(16,185,129,0.4)" : "none",
            }}
          >
            ✓ Coletar tudo ({claimableCount})
          </button>
        </div>
      </div>

      {state.badges.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, letterSpacing: 0.5 }}>BADGES:</span>
          {state.badges.map((b, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px",
              borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
              color: "#fff", boxShadow: "0 0 12px rgba(124,58,237,0.5)",
            }}>🎖️ {b}</span>
          ))}
        </div>
      )}

      {/* Tier track */}
      <div ref={trackRef} style={{
        display: "flex", gap: 12, overflowX: "auto", padding: "10px 4px 20px",
        scrollSnapType: "x mandatory",
      }}>
        {BATTLE_PASS_TIERS.map(t => {
          const claimed = state.claimedTiers.includes(t.tier);
          const reached = state.currentXP >= t.xpRequired;
          const isMilestone = t.tier % 10 === 0 || t.tier === MAX_TIER;
          const claimable = reached && !claimed;
          return (
            <div
              key={t.tier}
              style={{
                minWidth: isMilestone ? 130 : 110,
                flexShrink: 0,
                borderRadius: 12,
                padding: 12,
                background: claimed
                  ? "linear-gradient(180deg, rgba(16,185,129,0.18), rgba(16,185,129,0.05))"
                  : claimable
                    ? "linear-gradient(180deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))"
                    : reached
                      ? "var(--color-bg-card)"
                      : "rgba(255,255,255,0.02)",
                border: `1.5px solid ${
                  claimed ? "rgba(16,185,129,0.5)"
                  : claimable ? "rgba(245,158,11,0.7)"
                  : isMilestone ? "rgba(124,58,237,0.5)"
                  : "var(--color-border)"}`,
                opacity: reached ? 1 : 0.5,
                cursor: claimable ? "pointer" : "default",
                transition: "all 0.2s ease",
                boxShadow: claimable
                  ? "0 0 20px rgba(245,158,11,0.4), 0 6px 12px rgba(0,0,0,0.3)"
                  : isMilestone && !reached
                    ? "0 0 14px rgba(124,58,237,0.25)"
                    : "none",
                position: "relative",
                scrollSnapAlign: "start",
              }}
              onClick={() => claimable && claimTier(t.tier)}
            >
              <div style={{
                fontSize: 9, fontWeight: 900, letterSpacing: 1, textAlign: "center",
                color: claimed ? "#10b981" : claimable ? "#fbbf24" : isMilestone ? "#a78bfa" : "var(--color-text-muted)",
                marginBottom: 6,
              }}>
                {isMilestone ? "★ TIER" : "TIER"} {t.tier}
              </div>
              <div style={{
                fontSize: isMilestone ? 44 : 36,
                textAlign: "center",
                filter: claimed ? "grayscale(0.4)" : "none",
                opacity: reached ? 1 : 0.55,
                marginBottom: 4,
              }}>
                {t.reward.icon}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, textAlign: "center",
                color: "var(--color-text-secondary)", lineHeight: 1.2,
                minHeight: 24,
              }}>
                {t.reward.label}
              </div>
              {claimable && (
                <div style={{
                  marginTop: 8, padding: "4px 6px", borderRadius: 6,
                  background: "#fbbf24", color: "#000",
                  fontSize: 9, fontWeight: 900, textAlign: "center",
                  textTransform: "uppercase", letterSpacing: 0.5,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}>
                  Coletar
                </div>
              )}
              {claimed && (
                <div style={{
                  marginTop: 8, padding: "4px 6px", borderRadius: 6,
                  background: "rgba(16,185,129,0.2)", color: "#10b981",
                  fontSize: 9, fontWeight: 900, textAlign: "center",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  ✓ Coletado
                </div>
              )}
              {!reached && (
                <div style={{
                  marginTop: 8, padding: "4px 6px", borderRadius: 6,
                  fontSize: 9, fontWeight: 700, textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {t.xpRequired - state.currentXP} XP
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 14, marginTop: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>💡 Como ganhar XP</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, fontSize: 11 }}>
          <span>🏆 Vitória: <strong>+100 XP</strong></span>
          <span>🤝 Empate: <strong>+30 XP</strong></span>
          <span>❌ Derrota: <strong>+10 XP</strong></span>
          <span>🛡️ Clean sheet: <strong>+25 XP</strong></span>
          <span>⭐ MOTM: <strong>+20 XP</strong></span>
          <span>🔥 Vencer clássico: <strong>+80 XP</strong></span>
          <span>🏆 Título de temporada: <strong>+1000 XP</strong></span>
          <span>🎯 Desafio diário: <strong>+50 XP</strong></span>
        </div>
      </div>
    </div>
  );
}
