import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";
import type { PlayerAttributes } from "../types/game";
import type { TrainingProgram } from "../engine/trainingEngine";

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

type FocusMode = "team" | "individual" | "positional";

export default function TrainingView() {
  const {
    playerSquad, trainingFocus, setTrainingFocus,
    advanceMonth, playerClub, lastTrainingReport,
  } = useGame();
  const navigate = useNavigate();

  const [justTrained, setJustTrained] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>(trainingFocus.type);

  const handleTrain = () => {
    advanceMonth();
    setJustTrained(true);
    setShowReport(true);
    setTimeout(() => setJustTrained(false), 2000);
  };

  const avgFitness = playerSquad.length
    ? Math.round(playerSquad.reduce((s, p) => s + p.fitness, 0) / playerSquad.length)
    : 0;
  const avgMorale = playerSquad.length
    ? Math.round(playerSquad.reduce((s, p) => s + p.morale, 0) / playerSquad.length)
    : 0;

  const prospects = [...playerSquad]
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

      {/* Training Report Modal */}
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
                <span style={styles.summaryLabel}>Infra</span>
                <span style={{ fontWeight: 800, color: getAttrColor(report.infrastructure), fontSize: "16px" }}>
                  {report.infrastructure}
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

            {/* Player details */}
            <div style={styles.reportList}>
              {report.players.slice(0, 12).map(pr => {
                const caDelta = pr.caAfter - pr.caBefore;
                return (
                  <div key={pr.playerId} style={styles.reportRow}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
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
          </div>
        </div>
      )}

      <div style={styles.content}>
        {/* Left: Training Focus */}
        <div style={styles.leftCol}>
          <div className="card" style={styles.card}>
            <h3 style={styles.sectionTitle}>🎯 Foco do Treino</h3>

            {/* Mode selector */}
            <div style={styles.typeRow}>
              <button
                onClick={() => { setFocusMode("team"); setTrainingFocus({ type: "team" }); }}
                style={{ ...styles.typeBtn, ...(focusMode === "team" ? styles.typeBtnActive : {}) }}
              >👥 Coletivo</button>
              <button
                onClick={() => { setFocusMode("individual"); setTrainingFocus({ type: "individual", attribute: "pace" }); }}
                style={{ ...styles.typeBtn, ...(focusMode === "individual" ? styles.typeBtnActive : {}) }}
              >🎯 Atributo</button>
              <button
                onClick={() => { setFocusMode("positional"); setTrainingFocus({ type: "positional", program: "attack" }); }}
                style={{ ...styles.typeBtn, ...(focusMode === "positional" ? styles.typeBtnActive : {}) }}
              >📋 Programa</button>
            </div>

            {focusMode === "team" && (
              <div style={styles.teamInfo}>
                <p style={styles.teamDesc}>
                  Treino equilibrado para todo o elenco. Melhoria gradual em todos os atributos.
                </p>
                <div style={styles.teamBenefits}>
                  <div style={styles.benefit}>✅ Melhoria uniforme</div>
                  <div style={styles.benefit}>✅ Boa para moral do grupo</div>
                  <div style={styles.benefit}>⚠️ Crescimento mais lento</div>
                </div>
              </div>
            )}

            {focusMode === "individual" && (
              <div style={styles.attrGrid}>
                {TRAINING_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTrainingFocus({ type: "individual", attribute: opt.key })}
                    style={{
                      ...styles.attrBtn,
                      ...(trainingFocus.attribute === opt.key ? styles.attrBtnActive : {}),
                    }}
                  >
                    <span style={styles.attrIcon}>{opt.icon}</span>
                    <div style={styles.attrInfo}>
                      <span style={styles.attrLabel}>{opt.label}</span>
                      <span style={styles.attrDesc}>{opt.desc}</span>
                    </div>
                    {trainingFocus.attribute === opt.key && (
                      <span style={styles.checkmark}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {focusMode === "positional" && (
              <div style={styles.attrGrid}>
                {PROGRAM_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTrainingFocus({ type: "positional", program: opt.key })}
                    style={{
                      ...styles.programBtn,
                      ...(trainingFocus.program === opt.key ? styles.attrBtnActive : {}),
                    }}
                  >
                    <span style={styles.attrIcon}>{opt.icon}</span>
                    <div style={{ ...styles.attrInfo, flex: 1 }}>
                      <span style={styles.attrLabel}>{opt.label}</span>
                      <span style={styles.attrDesc}>{opt.desc}</span>
                      <span style={styles.boostTag}>{opt.boosts}</span>
                    </div>
                    {trainingFocus.program === opt.key && (
                      <span style={styles.checkmark}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infrastructure */}
          <div className="card" style={styles.card}>
            <h3 style={styles.sectionTitle}>🏟️ Infraestrutura</h3>
            <div style={styles.infraRow}>
              <div style={styles.infraBar}>
                <div style={{
                  ...styles.infraFill,
                  width: `${playerClub.infrastructure}%`,
                  background: `linear-gradient(90deg, ${getAttrColor(playerClub.infrastructure)}aa, ${getAttrColor(playerClub.infrastructure)})`,
                }} />
              </div>
              <span style={{
                fontWeight: 900, fontSize: "18px",
                color: getAttrColor(playerClub.infrastructure),
              }}>
                {playerClub.infrastructure}
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "8px" }}>
              Infraestrutura melhor = treinos mais eficientes. Impacta diretamente o desenvolvimento.
            </p>
          </div>
        </div>

        {/* Right: Team Status + Prospects */}
        <div style={styles.rightCol}>
          {/* Team Condition */}
          <div className="card" style={styles.card}>
            <h3 style={styles.sectionTitle}>📊 Condição do Elenco</h3>
            <div style={styles.condGrid}>
              <div style={styles.condItem}>
                <span style={styles.condLabel}>Fitness Médio</span>
                <span style={{ ...styles.condValue, color: getAttrColor(avgFitness) }}>{avgFitness}%</span>
              </div>
              <div style={styles.condItem}>
                <span style={styles.condLabel}>Moral Média</span>
                <span style={{ ...styles.condValue, color: getAttrColor(avgMorale) }}>{avgMorale}%</span>
              </div>
              <div style={styles.condItem}>
                <span style={styles.condLabel}>Total Jogadores</span>
                <span style={styles.condValue}>{playerSquad.length}</span>
              </div>
              <div style={styles.condItem}>
                <span style={styles.condLabel}>Jovens (≤21)</span>
                <span style={styles.condValue}>{playerSquad.filter(p => p.age <= 21).length}</span>
              </div>
            </div>
          </div>

          {/* Top Prospects */}
          <div className="card" style={styles.card}>
            <h3 style={styles.sectionTitle}>🌟 Maiores Potenciais</h3>
            <div style={styles.prospectList}>
              {prospects.map(p => (
                <div key={p.id} style={styles.prospectRow}>
                  <div style={styles.prospectInfo}>
                    <span
                      style={{ fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                      onClick={() => navigate(`/game/player/${p.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--color-accent-primary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                    >{p.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {p.position} • {p.age} anos
                    </span>
                  </div>
                  <div style={styles.prospectBars}>
                    <div style={styles.caBox}>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>CA</span>
                      <span style={{ fontWeight: 700, color: getAttrColor(p.currentAbility) }}>{p.currentAbility}</span>
                    </div>
                    <div style={styles.progressOuter}>
                      <div style={{
                        height: "100%", borderRadius: "3px",
                        width: `${(p.currentAbility / p.potentialAbility) * 100}%`,
                        background: `linear-gradient(90deg, ${getAttrColor(p.currentAbility)}, ${getAttrColor(p.potentialAbility)})`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div style={styles.caBox}>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>PA</span>
                      <span style={{ fontWeight: 700, color: getAttrColor(p.potentialAbility) }}>{p.potentialAbility}</span>
                    </div>
                    <span style={{
                      fontSize: "12px", fontWeight: 800, width: "36px", textAlign: "right",
                      color: p.gap > 10 ? "#10b981" : p.gap > 5 ? "#f59e0b" : "#94a3b8",
                    }}>+{p.gap}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Squad Fitness/Morale */}
          <div className="card" style={{ ...styles.card, flex: 1, overflow: "auto" }}>
            <h3 style={styles.sectionTitle}>🏃 Condição Individual</h3>
            <div style={styles.condList}>
              {[...playerSquad].sort((a, b) => a.fitness - b.fitness).map(p => (
                <div key={p.id} style={styles.condRow}>
                  <span style={{ fontSize: "12px", flex: 1, fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)", width: "32px" }}>{p.position}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "80px" }}>
                    <div className="attr-bar" style={{ width: "50px" }}>
                      <div className="attr-bar-fill" style={{
                        width: `${p.fitness}%`,
                        background: getAttrColor(p.fitness),
                      }} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: getAttrColor(p.fitness), width: "24px", textAlign: "right" }}>
                      {p.fitness}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "80px" }}>
                    <div className="attr-bar" style={{ width: "50px" }}>
                      <div className="attr-bar-fill" style={{
                        width: `${p.morale}%`,
                        background: getAttrColor(p.morale),
                      }} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: getAttrColor(p.morale), width: "24px", textAlign: "right" }}>
                      {p.morale}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 },
  title: { fontSize: "24px", fontWeight: 800 },
  content: { display: "flex", gap: "20px", flex: 1, overflow: "hidden" },

  leftCol: { flex: "0 0 420px", display: "flex", flexDirection: "column", gap: "16px", overflow: "auto" },
  rightCol: { flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflow: "hidden" },

  card: { padding: "20px" },
  sectionTitle: { fontSize: "13px", fontWeight: 700, marginBottom: "14px", color: "var(--color-text-secondary)" },

  typeRow: { display: "flex", gap: "6px", marginBottom: "16px" },
  typeBtn: {
    flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 600,
    background: "var(--color-bg-hover)", border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
  },
  typeBtnActive: {
    background: "var(--color-accent-primary)", borderColor: "var(--color-accent-primary)", color: "#fff",
  },

  teamInfo: { padding: "12px", background: "var(--color-bg-hover)", borderRadius: "8px" },
  teamDesc: { fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "12px" },
  teamBenefits: { display: "flex", flexDirection: "column", gap: "4px" },
  benefit: { fontSize: "12px", color: "var(--color-text-primary)" },

  attrGrid: { display: "flex", flexDirection: "column", gap: "6px" },
  attrBtn: {
    display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
    borderRadius: "var(--radius-sm)", background: "var(--color-bg-hover)",
    border: "1px solid var(--color-border)", cursor: "pointer",
    fontFamily: "var(--font-sans)", transition: "all 0.15s", textAlign: "left",
    color: "var(--color-text-primary)",
  },
  attrBtnActive: {
    borderColor: "var(--color-accent-primary)", background: "rgba(16, 185, 129, 0.1)",
  },
  programBtn: {
    display: "flex", alignItems: "center", gap: "12px", padding: "12px 12px",
    borderRadius: "var(--radius-sm)", background: "var(--color-bg-hover)",
    border: "1px solid var(--color-border)", cursor: "pointer",
    fontFamily: "var(--font-sans)", transition: "all 0.15s", textAlign: "left",
    color: "var(--color-text-primary)",
  },
  attrIcon: { fontSize: "20px", width: "28px", textAlign: "center" },
  attrInfo: { flex: 1, display: "flex", flexDirection: "column", gap: "1px" },
  attrLabel: { fontSize: "13px", fontWeight: 700 },
  attrDesc: { fontSize: "10px", color: "var(--color-text-muted)" },
  boostTag: {
    fontSize: "9px", fontWeight: 700, color: "#10b981",
    marginTop: "2px", letterSpacing: "0.3px",
  },
  checkmark: { color: "var(--color-accent-primary)", fontWeight: 900, fontSize: "16px" },

  infraRow: { display: "flex", alignItems: "center", gap: "12px" },
  infraBar: { flex: 1, height: "10px", borderRadius: "5px", background: "var(--color-bg-hover)", overflow: "hidden" },
  infraFill: { height: "100%", borderRadius: "5px", transition: "width 0.5s ease" },

  condGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  condItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "12px", background: "var(--color-bg-hover)", borderRadius: "8px" },
  condLabel: { fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" },
  condValue: { fontSize: "22px", fontWeight: 900, color: "var(--color-accent-primary)" },

  prospectList: { display: "flex", flexDirection: "column", gap: "10px" },
  prospectRow: { display: "flex", flexDirection: "column", gap: "6px", padding: "8px 0", borderBottom: "1px solid var(--color-border)" },
  prospectInfo: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  prospectBars: { display: "flex", alignItems: "center", gap: "8px" },
  caBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", minWidth: "28px" },
  progressOuter: { flex: 1, height: "6px", borderRadius: "3px", background: "var(--color-bg-hover)", overflow: "hidden" },

  condList: { display: "flex", flexDirection: "column", gap: "2px" },
  condRow: { display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" },

  // Report modal
  reportOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  reportModal: {
    background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
    borderRadius: "16px", padding: "24px", maxWidth: "680px", width: "90%",
    maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  },
  reportHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "16px", flexShrink: 0,
  },
  reportSummary: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px",
    marginBottom: "16px", flexShrink: 0,
  },
  summaryCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
    padding: "10px 8px", background: "var(--color-bg-hover)", borderRadius: "8px",
    border: "1px solid var(--color-border)",
  },
  summaryLabel: {
    fontSize: "9px", color: "var(--color-text-muted)",
    textTransform: "uppercase", letterSpacing: "0.3px",
  },
  reportList: {
    flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "6px",
  },
  reportRow: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 10px", background: "var(--color-bg-card)", borderRadius: "6px",
    border: "1px solid var(--color-border)",
  },
};
