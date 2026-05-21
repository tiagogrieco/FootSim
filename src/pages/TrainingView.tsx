import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";
import type { PlayerAttributes } from "../types/game";
import type { TrainingProgram, TrainingIntensity } from "../engine/trainingEngine";
import { INTENSITY_CONFIG } from "../engine/trainingEngine";
import { STAFF_EFFECTS } from "../types/staff";

const TRAINING_OPTIONS: { key: keyof PlayerAttributes; label: string; icon: string; desc: string }[] = [
  { key: "pace", label: "Velocidade", icon: "⚡", desc: "Sprints, agilidade e aceleração" },
  { key: "shooting", label: "Finalização", icon: "🎯", desc: "Chutes, posicionamento ofensivo" },
  { key: "passing", label: "Passe", icon: "🔄", desc: "Passes curtos, longos e visão de jogo" },
  { key: "dribbling", label: "Drible", icon: "✨", desc: "Controle de bola e habilidade" },
  { key: "defending", label: "Defesa", icon: "🛡️", desc: "Marcação, tackles e posicionamento" },
  { key: "physical", label: "Físico", icon: "💪", desc: "Força, resistência e preparo" },
  { key: "goalkeeping", label: "Goleiro", icon: "🧤", desc: "Reflexos, posicionamento e saída" },
];

const PROGRAM_OPTIONS: { key: TrainingProgram; label: string; icon: string; desc: string; boosts: string }[] = [
  { key: "attack", label: "Ofensivo", icon: "⚔️", desc: "Foco em ataque rápido e letal", boosts: "FIN +++ DRI ++ VEL +" },
  { key: "defense", label: "Defensivo", icon: "🛡️", desc: "Solidez tática e marcação", boosts: "DEF +++ FIS ++ VEL +" },
  { key: "playmaking", label: "Armador", icon: "🎩", desc: "Construção e criatividade", boosts: "PAS +++ DRI ++ FIS +" },
  { key: "goalkeeping", label: "Goleiro", icon: "🧤", desc: "Treino específico de goleiros", boosts: "GOL +++ FIS + DEF +" },
  { key: "fitness", label: "Físico", icon: "🏃", desc: "Preparação física geral", boosts: "FIS ++ VEL ++" },
];

const INTENSITY_OPTIONS: { key: TrainingIntensity; label: string; icon: string; desc: string; color: string }[] = [
  { key: "light", label: "Leve", icon: "🟢", desc: "Baixo risco, pouco crescimento, recupera fitness", color: "#10b981" },
  { key: "normal", label: "Normal", icon: "🟡", desc: "Equilíbrio entre crescimento e risco", color: "#f59e0b" },
  { key: "intense", label: "Intenso", icon: "🔴", desc: "Máximo crescimento, alto risco de lesão", color: "#ef4444" },
];

type FocusMode = "team" | "individual" | "positional";

export default function TrainingView() {
  const {
    playerSquad, trainingFocus, setTrainingFocus,
    advanceMonth, playerClub, lastTrainingReport,
    trainingHistory, staffPool, hireStaff, fireStaff, budget,
  } = useGame();
  const navigate = useNavigate();

  const [justTrained, setJustTrained] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>(trainingFocus.type);
  const [intensity, setIntensity] = useState<TrainingIntensity>(trainingFocus.intensity || "normal");

  const handleTrain = () => {
    // Apply intensity to the current focus
    setTrainingFocus({ ...trainingFocus, intensity });
    setTimeout(() => {
      advanceMonth();
      setJustTrained(true);
      setShowReport(true);
      setTimeout(() => setJustTrained(false), 2000);
    }, 50);
  };

  const avgFitness = playerSquad.length
    ? Math.round(playerSquad.reduce((s, p) => s + p.fitness, 0) / playerSquad.length)
    : 0;
  const avgMorale = playerSquad.length
    ? Math.round(playerSquad.reduce((s, p) => s + p.morale, 0) / playerSquad.length)
    : 0;

  const injuredPlayers = playerSquad.filter(p => p.injuryDays && p.injuryDays > 0);
  const prospects = [...playerSquad]
    .filter(p => !p.injuryDays)
    .map(p => ({ ...p, gap: p.potentialAbility - p.currentAbility }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  const report = lastTrainingReport;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏋️ Centro de Treinamento</h1>
        <button
          className={justTrained ? "btn-secondary" : "btn-primary"}
          onClick={handleTrain}
          disabled={justTrained}
        >
          {justTrained ? "✅ Treino aplicado!" : "📅 Avançar Mês (Treinar)"}
        </button>
      </div>

      {/* ========== TRAINING REPORT MODAL ========== */}
      {showReport && report && (
        <div style={styles.reportOverlay} onClick={() => setShowReport(false)}>
          <div style={styles.reportModal} onClick={e => e.stopPropagation()}>
            <div style={styles.reportHeader}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>📊 Relatório de Treino</h2>
              <button
                className="btn-secondary"
                onClick={() => setShowReport(false)}
                style={{ fontSize: "12px", padding: "4px 12px" }}
              >✕</button>
            </div>

            {/* Summary cards */}
            <div style={styles.reportSummary}>
              <div style={styles.summaryCard}>
                <span style={styles.summaryLabel}>Programa</span>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>{report.focusLabel}</span>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.summaryLabel}>Intensidade</span>
                <span style={{
                  fontWeight: 800, fontSize: "13px",
                  color: report.intensity === "intense" ? "#ef4444" : report.intensity === "light" ? "#10b981" : "#f59e0b",
                }}>
                  {INTENSITY_CONFIG[report.intensity].label}
                </span>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.summaryLabel}>Crescimento Médio</span>
                <span style={{
                  fontWeight: 800, fontSize: "16px",
                  color: report.avgGrowth > 0 ? "#10b981" : report.avgGrowth < 0 ? "#ef4444" : "#94a3b8",
                }}>
                  {report.avgGrowth >= 0 ? "+" : ""}{report.avgGrowth.toFixed(1)} CA
                </span>
              </div>
              {report.topGrower && (
                <div style={{ ...styles.summaryCard, borderColor: "rgba(16,185,129,0.4)" }}>
                  <span style={styles.summaryLabel}>🌟 Destaque</span>
                  <span style={{ fontWeight: 700, fontSize: "12px", color: "#10b981" }}>
                    {report.topGrower.name} (+{report.topGrower.caDelta})
                  </span>
                </div>
              )}
            </div>

            {/* New Injuries */}
            {report.newInjuries.length > 0 && (
              <div style={styles.injuryBanner}>
                🏥 <strong>{report.newInjuries.length} lesão(ões) durante o treino:</strong>
                {report.newInjuries.map(inj => (
                  <div key={inj.playerId} style={{ marginTop: "4px", fontSize: "12px" }}>
                    {inj.playerName} — {inj.type} ({inj.weeksRemaining} semanas)
                  </div>
                ))}
              </div>
            )}

            {/* Player details */}
            <div style={styles.reportList}>
              {report.players.slice(0, 15).map(pr => {
                const caDelta = pr.caAfter - pr.caBefore;
                return (
                  <div key={pr.playerId} style={styles.reportRow}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                      {pr.injured && <span style={{ fontSize: "14px" }}>🏥</span>}
                      <span
                        style={{ fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                        onClick={() => navigate(`/game/player/${pr.playerId}`)}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--color-accent-primary)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                      >{pr.playerName}</span>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{pr.position} • {pr.age}a</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      {pr.changes.slice(0, 4).map(c => (
                        <span key={c.attr} style={{
                          fontSize: "10px", padding: "2px 6px", borderRadius: "4px",
                          fontWeight: 700,
                          background: c.delta > 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                          color: c.delta > 0 ? "#10b981" : "#ef4444",
                        }}>
                          {c.label.slice(0, 3)} {c.delta > 0 ? "+" : ""}{c.delta}
                        </span>
                      ))}
                    </div>
                    <span style={{
                      fontWeight: 900, fontSize: "13px", width: "50px", textAlign: "right",
                      color: caDelta > 0 ? "#10b981" : caDelta < 0 ? "#ef4444" : "#94a3b8",
                    }}>
                      {caDelta > 0 ? "+" : ""}{caDelta} CA
                    </span>
                  </div>
                );
              })}
            </div>

            <button className="btn-primary" onClick={() => setShowReport(false)} style={{ width: "100%", marginTop: "12px" }}>
              Fechar Relatório
            </button>
          </div>
        </div>
      )}

      {/* ========== INJURED PLAYERS ========== */}
      {injuredPlayers.length > 0 && (
        <div className="card" style={{ padding: "16px", marginBottom: "16px", borderLeft: "4px solid #ef4444" }}>
          <h3 style={styles.sectionTitle}>🏥 Departamento Médico ({injuredPlayers.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {injuredPlayers.map(p => (
              <div key={p.id} style={styles.injuryCard}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>{p.name}</span>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{p.position}</span>
                <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700 }}>
                  {Math.ceil((p.injuryDays || 0) / 7)} sem.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== STAFF ========== */}
      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        <h3 style={styles.sectionTitle}>👔 Comissão Técnica</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {staffPool.map(member => {
            const effect = STAFF_EFFECTS[member.role];
            const isHired = member.hired;
            return (
              <div key={member.id} style={{
                padding: "10px", borderRadius: "8px",
                background: isHired ? "rgba(16,185,129,0.08)" : "var(--color-bg-secondary)",
                border: `1px solid ${isHired ? "#10b981" : "var(--color-border)"}`,
                opacity: isHired ? 1 : 0.7,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>{effect.icon} {member.name}</span>
                  <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                    Q{member.quality}{isHired && ` • 😊 ${member.satisfaction ?? 75}%`}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                  {effect.label} — {effect.desc}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-accent-secondary)" }}>
                    R$ {(member.wage / 1000).toFixed(0)}K/mês
                  </span>
                  {isHired ? (
                    <button className="btn-secondary" onClick={() => fireStaff(member.id)} style={{ fontSize: "10px", padding: "2px 8px" }}>Demitir</button>
                  ) : (
                    <button className="btn-primary" onClick={() => hireStaff(member.id)} disabled={budget < member.wage * 12} style={{ fontSize: "10px", padding: "2px 8px" }}>Contratar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== INTENSITY SELECTOR ========== */}
      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        <h3 style={styles.sectionTitle}>⚡ Intensidade do Treino</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {INTENSITY_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                setIntensity(opt.key);
                setTrainingFocus({ ...trainingFocus, intensity: opt.key });
              }}
              style={{
                padding: "14px 12px", borderRadius: "10px", cursor: "pointer",
                background: intensity === opt.key ? `${opt.color}18` : "var(--color-bg-secondary)",
                border: intensity === opt.key ? `2px solid ${opt.color}` : "2px solid transparent",
                textAlign: "left", transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "4px" }}>
                {opt.icon} {opt.label}
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{opt.desc}</div>
              <div style={{ fontSize: "10px", color: opt.color, fontWeight: 700, marginTop: "6px" }}>
                Crescimento: ×{INTENSITY_CONFIG[opt.key].growthMult} • Risco: {Math.round(INTENSITY_CONFIG[opt.key].injuryBaseChance * 100)}%
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ========== SQUAD STATUS ========== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div className="card" style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Fitness Médio</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: getAttrColor(avgFitness) }}>{avgFitness}%</div>
        </div>
        <div className="card" style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Moral Médio</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: getAttrColor(avgMorale) }}>{avgMorale}%</div>
        </div>
        <div className="card" style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Infraestrutura</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: getAttrColor(playerClub.infrastructure) }}>{playerClub.infrastructure}</div>
        </div>
      </div>

      {/* ========== TRAINING HISTORY ========== */}
      {trainingHistory.length > 0 && (
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <h3 style={styles.sectionTitle}>📈 Histórico de Evolução (CA médio)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "60px" }}>
            {trainingHistory.map((h, i) => {
              const val = h.avgGrowth;
              const maxAbs = Math.max(1, ...trainingHistory.map(t => Math.abs(t.avgGrowth)));
              const barH = Math.max(4, (Math.abs(val) / maxAbs) * 50);
              return (
                <div key={i} style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                }}>
                  <div style={{
                    width: "100%", height: `${barH}px`, borderRadius: "3px 3px 0 0",
                    background: val >= 0 ? "#10b981" : "#ef4444",
                  }}
                    title={`${val >= 0 ? "+" : ""}${val.toFixed(1)} CA (${h.focusLabel}, ${INTENSITY_CONFIG[h.intensity].label})`}
                  />
                  <span style={{ fontSize: "9px", color: "var(--color-text-muted)", marginTop: "3px" }}>
                    M{h.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== FOCUS MODE SELECTOR ========== */}
      <div style={styles.focusTabs}>
        {(["team", "individual", "positional"] as FocusMode[]).map(mode => (
          <button
            key={mode}
            className={focusMode === mode ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              setFocusMode(mode);
              if (mode === "team") setTrainingFocus({ type: "team", intensity });
            }}
            style={{ flex: 1, fontSize: "12px" }}
          >
            {mode === "team" ? "🏟️ Coletivo" : mode === "individual" ? "🎯 Individual" : "📋 Programa"}
          </button>
        ))}
      </div>

      {/* Focus Content */}
      {focusMode === "individual" && (
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <h3 style={styles.sectionTitle}>🎯 Foco Individual — Selecione o Atributo</h3>
          <div style={styles.optionsGrid}>
            {TRAINING_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setTrainingFocus({ type: "individual", attribute: opt.key, intensity })}
                style={{
                  ...styles.optionCard,
                  ...(trainingFocus.type === "individual" && trainingFocus.attribute === opt.key ? styles.optionActive : {}),
                }}
              >
                <div style={{ fontSize: "22px" }}>{opt.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>{opt.label}</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {focusMode === "positional" && (
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <h3 style={styles.sectionTitle}>📋 Programa de Treino — Selecione</h3>
          <div style={styles.programsGrid}>
            {PROGRAM_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setTrainingFocus({ type: "positional", program: opt.key, intensity })}
                style={{
                  ...styles.programCard,
                  ...(trainingFocus.type === "positional" && trainingFocus.program === opt.key ? styles.programActive : {}),
                }}
              >
                <div style={{ fontSize: "28px" }}>{opt.icon}</div>
                <div style={{ fontWeight: 800, fontSize: "14px" }}>{opt.label}</div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{opt.desc}</div>
                <div style={{
                  fontSize: "10px", marginTop: "6px", padding: "2px 8px", borderRadius: "4px",
                  background: "var(--color-bg-secondary)", fontWeight: 700, color: "var(--color-accent-primary)",
                }}>
                  {opt.boosts}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prospects */}
      <div className="card" style={{ padding: "16px" }}>
        <h3 style={styles.sectionTitle}>🌟 Maiores Potenciais</h3>
        {prospects.map(p => {
          const gap = p.potentialAbility - p.currentAbility;
          return (
            <div key={p.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid var(--color-border)",
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  onClick={() => navigate(`/game/player/${p.id}`)}
                >{p.name}</span>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", marginLeft: "8px" }}>
                  {p.position} • {p.age}a
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: getAttrColor(p.currentAbility) }}>
                  CA {p.currentAbility}
                </span>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>→</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#3b82f6" }}>
                  POT {p.potentialAbility}
                </span>
                <span style={{
                  fontSize: "11px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px",
                  background: "rgba(16,185,129,0.15)", color: "#10b981",
                }}>
                  +{gap}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflow: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title: { fontSize: "24px", fontWeight: 800 },
  sectionTitle: { fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "var(--color-text-secondary)" },
  focusTabs: { display: "flex", gap: "8px", marginBottom: "16px" },

  // Report modal
  reportOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
  },
  reportModal: {
    background: "var(--color-bg-primary)", borderRadius: "16px", padding: "24px",
    width: "100%", maxWidth: "600px", maxHeight: "80vh", overflow: "auto",
    border: "1px solid var(--color-border)",
  },
  reportHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px",
  },
  reportSummary: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px",
  },
  summaryCard: {
    padding: "10px", borderRadius: "8px", background: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)", display: "flex", flexDirection: "column" as const,
    alignItems: "center", gap: "4px",
  },
  summaryLabel: { fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" as const },
  reportList: { display: "flex", flexDirection: "column" as const, gap: "6px" },
  reportRow: {
    display: "flex", alignItems: "center", gap: "12px", padding: "6px 8px",
    borderRadius: "6px", background: "var(--color-bg-secondary)",
  },
  injuryBanner: {
    padding: "12px", borderRadius: "8px", marginBottom: "12px",
    background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "13px",
  },

  // Injury cards
  injuryCard: {
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "2px",
    padding: "10px 16px", borderRadius: "8px", background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
  },

  // Options
  optionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" },
  optionCard: {
    padding: "14px", borderRadius: "10px", border: "2px solid transparent",
    background: "var(--color-bg-secondary)", cursor: "pointer", textAlign: "center" as const,
    transition: "all 0.2s",
  },
  optionActive: {
    border: "2px solid var(--color-accent-primary)",
    background: "rgba(var(--color-accent-primary-rgb, 59, 130, 246), 0.08)",
  },
  programsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" },
  programCard: {
    padding: "16px", borderRadius: "12px", border: "2px solid transparent",
    background: "var(--color-bg-secondary)", cursor: "pointer", textAlign: "center" as const,
    transition: "all 0.2s",
  },
  programActive: {
    border: "2px solid var(--color-accent-primary)",
    background: "rgba(var(--color-accent-primary-rgb, 59, 130, 246), 0.08)",
  },
};
