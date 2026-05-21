import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";
import { useRef, useEffect, useState } from "react";

const ATTRS = [
  { key: "pace" as const, label: "Velocidade", icon: "⚡" },
  { key: "shooting" as const, label: "Finalização", icon: "🎯" },
  { key: "passing" as const, label: "Passe", icon: "🎯" },
  { key: "dribbling" as const, label: "Drible", icon: "🦶" },
  { key: "defending" as const, label: "Defesa", icon: "🛡️" },
  { key: "physical" as const, label: "Físico", icon: "💪" },
  { key: "goalkeeping" as const, label: "Goleiro", icon: "🧤" },
];

function getBadgeClass(pos: string): string {
  if (pos === "GK") return "badge-gk";
  if (["CB", "LB", "RB"].includes(pos)) return "badge-def";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "badge-mid";
  return "badge-fwd";
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val}`;
}

function RadarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = 110;
    const n = values.length;
    const angleStep = (Math.PI * 2) / n;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    // Grid rings
    for (let ring = 1; ring <= 5; ring++) {
      const r = (ring / 5) * maxR;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = startAngle + angleStep * i;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(148, 163, 184, ${ring === 5 ? 0.3 : 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
      const angle = startAngle + angleStep * i;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = startAngle + angleStep * idx;
      const r = (values[idx] / 100) * maxR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Fill gradient
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, "rgba(16, 185, 129, 0.35)");
    grad.addColorStop(1, "rgba(16, 185, 129, 0.08)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points
    for (let i = 0; i < n; i++) {
      const angle = startAngle + angleStep * i;
      const r = (values[i] / 100) * maxR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Labels
    ctx.font = "600 11px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < n; i++) {
      const angle = startAngle + angleStep * i;
      const labelR = maxR + 20;
      const x = cx + Math.cos(angle) * labelR;
      const y = cy + Math.sin(angle) * labelR;
      ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
      ctx.fillText(labels[i], x, y);
    }
  }, [values, labels]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

export default function PlayerProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playerSquad, allSquads, allClubs, playerClub, generatePlayerScoutReport, budget } = useGame();
  const [scouting, setScouting] = useState(false);

  // Find player across all squads
  const playerId = Number(id);
  let player = playerSquad.find(p => p.id === playerId);
  let ownerClub = player ? playerClub : undefined;

  if (!player) {
    for (const [clubId, squad] of allSquads) {
      const found = squad.find(p => p.id === playerId);
      if (found) {
        player = found;
        ownerClub = allClubs.find(c => c.id === clubId);
        break;
      }
    }
  }

  if (!player) {
    return (
      <div style={styles.page}>
        <div style={styles.notFound}>
          <h2>Jogador não encontrado</h2>
          <button className="btn-secondary" onClick={() => navigate(-1)}>← Voltar</button>
        </div>
      </div>
    );
  }

  const radarValues = ATTRS.map(a => player!.attributes[a.key]);
  const radarLabels = ATTRS.map(a => a.label);
  const growth = player.potentialAbility - player.currentAbility;

  const scoutReport = playerClub.scoutReports?.[player.id];

  const handleRequestReport = async () => {
    if (!player) return;
    if (budget < 5000) {
      alert("Orçamento insuficiente! Custo para enviar olheiro: R$ 5.000");
      return;
    }
    setScouting(true);
    try {
      await generatePlayerScoutReport(player.id);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar relatório do olheiro. Tente novamente.");
    } finally {
      setScouting(false);
    }
  };
  const isYoungTalent = player.age <= 23 && growth >= 8;
  const isPrime = player.age >= 26 && player.age <= 30;
  const isVeteran = player.age >= 32;

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ fontSize: "13px" }}>
          ← Voltar
        </button>
        <div style={styles.topBarRight}>
          {isYoungTalent && <span style={styles.tagYouth}>🌟 Joia</span>}
          {isPrime && <span style={styles.tagPrime}>🔥 Prime</span>}
          {isVeteran && <span style={styles.tagVet}>🧓 Veterano</span>}
        </div>
      </div>

      <div style={styles.content}>
        {/* Left column - Player card */}
        <div style={styles.leftCol}>
          {/* Main card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.shirtCircle}>
                <span style={styles.shirtNum}>{player.shirtNumber}</span>
              </div>
              <div>
                <h1 style={styles.playerName}>{player.name}</h1>
                <div style={styles.metaRow}>
                  <span className={`badge ${getBadgeClass(player.position)}`}>{player.position}</span>
                  <span style={styles.metaText}>{player.age} anos</span>
                  <span style={styles.metaText}>🌍 {player.nationality}</span>
                </div>
                {ownerClub && (
                  <div style={styles.clubTag}>
                    <span style={{
                      display: "inline-block", width: "10px", height: "10px", borderRadius: "50%",
                      background: ownerClub.colors?.primary || "#444",
                      border: `1px solid ${ownerClub.colors?.secondary || "#888"}`,
                    }} />
                    <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{ownerClub.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ability meters */}
            <div style={styles.abilitySection}>
              <div style={styles.abilityCard}>
                <span style={styles.abilityLabel}>CA</span>
                <span style={{ ...styles.abilityNum, color: getAttrColor(player.currentAbility) }}>
                  {player.currentAbility}
                </span>
              </div>
              <div style={styles.abilityCard}>
                <span style={styles.abilityLabel}>PA</span>
                <span style={{ ...styles.abilityNum, color: getAttrColor(player.potentialAbility) }}>
                  {player.potentialAbility}
                </span>
              </div>
              <div style={styles.abilityCard}>
                <span style={styles.abilityLabel}>Crescimento</span>
                <span style={{
                  ...styles.abilityNum,
                  color: growth >= 10 ? "#10b981" : growth >= 5 ? "#f59e0b" : "#94a3b8",
                  fontSize: "22px",
                }}>
                  +{growth}
                </span>
              </div>
            </div>
          </div>

          {/* Contract info */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>📋 Contrato & Vestiário</h3>
            <div style={styles.contractGrid}>
              <div style={styles.contractItem}>
                <span style={styles.contractLabel}>Valor de Mercado</span>
                <span style={{ color: "var(--color-accent-secondary)", fontWeight: 700, fontSize: "15px" }}>
                  {formatCurrency(player.marketValue)}
                </span>
              </div>
              <div style={styles.contractItem}>
                <span style={styles.contractLabel}>Salário</span>
                <span style={{ fontWeight: 700, fontSize: "15px" }}>
                  {formatCurrency(player.wage)}/mês
                </span>
              </div>
              <div style={styles.contractItem}>
                <span style={styles.contractLabel}>Fitness</span>
                <span style={{ color: getAttrColor(player.fitness), fontWeight: 700, fontSize: "15px" }}>
                  {player.fitness}%
                </span>
              </div>
              <div style={styles.contractItem}>
                <span style={styles.contractLabel}>Moral</span>
                <span style={{ color: getAttrColor(player.morale), fontWeight: 700, fontSize: "15px" }}>
                  {player.morale}%
                </span>
              </div>
              <div style={styles.contractItem}>
                <span style={styles.contractLabel}>Satisfação</span>
                <span style={{ color: (player.happiness ?? 50) < 30 ? "#ef4444" : (player.happiness ?? 50) < 60 ? "#f59e0b" : "#10b981", fontWeight: 700, fontSize: "15px" }}>
                  {player.happiness ?? 50}%
                </span>
              </div>
              <div style={styles.contractItem}>
                <span style={styles.contractLabel}>Situação</span>
                <span style={{ color: (player.strikeDays ?? 0) > 0 ? "#ef4444" : "#10b981", fontWeight: 700, fontSize: "14px" }}>
                  {(player.strikeDays ?? 0) > 0 ? `✊ Greve (${player.strikeDays}d)` : "✅ Disponível"}
                </span>
              </div>
              {((player.playtimePromiseMatches ?? 0) > 0) && (
                <div style={{ ...styles.contractItem, gridColumn: "span 2" }}>
                  <span style={styles.contractLabel}>🤝 Promessa de Tempo de Jogo</span>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    Deve ser titular em mais <strong>{player.playtimePromiseMatches}</strong> partidas (titular em {player.playtimePromiseStarts ?? 0} até agora).
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Season Stats */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>📊 Estatísticas da Temporada</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
              {(() => {
                const s = player!.seasonStats || { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, avgRating: 0, cleanSheets: 0, motm: 0 };
                const statItems = [
                  { label: "Jogos", value: s.appearances, icon: "🏟️", color: "var(--color-text-primary)" },
                  { label: "Gols", value: s.goals, icon: "⚽", color: s.goals > 0 ? "#10b981" : "var(--color-text-muted)" },
                  { label: "Assists", value: s.assists, icon: "🅰️", color: s.assists > 0 ? "#3b82f6" : "var(--color-text-muted)" },
                  { label: "Rating", value: s.avgRating ? s.avgRating.toFixed(1) : "-", icon: "⭐", color: s.avgRating >= 7.5 ? "#10b981" : s.avgRating >= 6.5 ? "#f59e0b" : "var(--color-text-muted)" },
                  { label: "Amarelos", value: s.yellowCards, icon: "🟨", color: s.yellowCards > 0 ? "#eab308" : "var(--color-text-muted)" },
                  { label: "Vermelhos", value: s.redCards, icon: "🟥", color: s.redCards > 0 ? "#ef4444" : "var(--color-text-muted)" },
                  { label: "Clean Sheet", value: s.cleanSheets, icon: "🧤", color: s.cleanSheets > 0 ? "#06b6d4" : "var(--color-text-muted)" },
                  { label: "MOTM", value: s.motm, icon: "🏆", color: s.motm > 0 ? "#f59e0b" : "var(--color-text-muted)" },
                ];
                return statItems.map((item, i) => (
                  <div key={i} style={{
                    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
                    borderRadius: "8px", padding: "10px 8px",
                    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "2px",
                  }}>
                    <span style={{ fontSize: "16px" }}>{item.icon}</span>
                    <span style={{ fontSize: "20px", fontWeight: 900, color: item.color }}>{item.value}</span>
                    <span style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.3px", fontWeight: 600 }}>{item.label}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Career History */}
          {player.careerHistory && player.careerHistory.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.sectionTitle}>📜 Histórico de Carreira</h3>
              <table className="data-table" style={{ fontSize: "11px" }}>
                <thead>
                  <tr>
                    <th>Temp.</th>
                    <th>Clube</th>
                    <th style={{ width: 35 }}>J</th>
                    <th style={{ width: 35 }}>⚽</th>
                    <th style={{ width: 35 }}>🅰️</th>
                    <th style={{ width: 35 }}>🟨</th>
                    <th style={{ width: 40 }}>⭐</th>
                    <th style={{ width: 35 }}>🏆</th>
                  </tr>
                </thead>
                <tbody>
                  {player.careerHistory.map((entry, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{entry.season}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 700, fontSize: "10px", color: "var(--color-text-muted)" }}>{entry.clubShort}</span>
                          <span>{entry.clubName}</span>
                        </div>
                      </td>
                      <td>{entry.stats.appearances}</td>
                      <td style={{ color: entry.stats.goals > 0 ? "#10b981" : "var(--color-text-muted)", fontWeight: entry.stats.goals > 0 ? 700 : 400 }}>
                        {entry.stats.goals}
                      </td>
                      <td style={{ color: entry.stats.assists > 0 ? "#3b82f6" : "var(--color-text-muted)", fontWeight: entry.stats.assists > 0 ? 700 : 400 }}>
                        {entry.stats.assists}
                      </td>
                      <td style={{ color: entry.stats.yellowCards > 0 ? "#eab308" : "var(--color-text-muted)" }}>
                        {entry.stats.yellowCards}
                      </td>
                      <td style={{ color: entry.stats.avgRating >= 7.5 ? "#10b981" : entry.stats.avgRating >= 6.5 ? "#f59e0b" : "var(--color-text-muted)" }}>
                        {entry.stats.avgRating ? entry.stats.avgRating.toFixed(1) : "-"}
                      </td>
                      <td style={{ color: entry.stats.motm > 0 ? "#f59e0b" : "var(--color-text-muted)" }}>
                        {entry.stats.motm}
                      </td>
                    </tr>
                  ))}
                  {/* Career Totals Row */}
                  <tr style={{ borderTop: "2px solid var(--color-border)", fontWeight: 800 }}>
                    <td colSpan={2} style={{ color: "var(--color-accent-primary)" }}>CARREIRA</td>
                    <td>{player.careerHistory.reduce((t, e) => t + e.stats.appearances, 0)}</td>
                    <td style={{ color: "#10b981" }}>{player.careerHistory.reduce((t, e) => t + e.stats.goals, 0)}</td>
                    <td style={{ color: "#3b82f6" }}>{player.careerHistory.reduce((t, e) => t + e.stats.assists, 0)}</td>
                    <td style={{ color: "#eab308" }}>{player.careerHistory.reduce((t, e) => t + e.stats.yellowCards, 0)}</td>
                    <td>
                      {(() => {
                        const totalApp = player.careerHistory.reduce((t, e) => t + e.stats.appearances, 0);
                        const totalRat = player.careerHistory.reduce((t, e) => t + e.stats.totalRating, 0);
                        return totalApp > 0 ? (totalRat / totalApp).toFixed(1) : "-";
                      })()}
                    </td>
                    <td style={{ color: "#f59e0b" }}>{player.careerHistory.reduce((t, e) => t + e.stats.motm, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Physical profile */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>🏃 Perfil Físico</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {player.age <= 23 && (
                <p style={styles.profileText}>
                  Jogador jovem com espaço para evolução. {growth >= 8 ? "Alto potencial de crescimento." : "Desenvolvimento moderado esperado."}
                </p>
              )}
              {player.age >= 24 && player.age <= 30 && (
                <p style={styles.profileText}>
                  Na melhor fase da carreira. Desempenho consistente e confiável.
                </p>
              )}
              {player.age >= 31 && (
                <p style={styles.profileText}>
                  Experiência é seu maior trunfo. {player.age >= 34 ? "Aposentadoria se aproxima." : "Ainda pode contribuir por mais temporadas."}
                </p>
              )}
              <div style={styles.fitnessBar}>
                <div style={{
                  ...styles.fitnessBarFill,
                  width: `${player.fitness}%`,
                  background: `linear-gradient(90deg, ${getAttrColor(player.fitness)}88, ${getAttrColor(player.fitness)})`,
                }} />
              </div>
              <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                Condição Física: {player.fitness >= 90 ? "Excelente" : player.fitness >= 70 ? "Boa" : player.fitness >= 50 ? "Regular" : "Baixa"}
              </span>
            </div>
          </div>
        </div>

        {/* Right column - Radar + Attributes */}
        <div style={styles.rightCol}>
          {/* Radar chart */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>📊 Radar de Atributos</h3>
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <RadarChart values={radarValues} labels={radarLabels} />
            </div>
          </div>

          {/* Attribute bars */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>📈 Atributos Detalhados</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ATTRS.map(attr => {
                const val = player!.attributes[attr.key];
                return (
                  <div key={attr.key} style={styles.attrRow}>
                    <span style={styles.attrIcon}>{attr.icon}</span>
                    <span style={styles.attrLabel}>{attr.label}</span>
                    <div style={styles.attrBarOuter}>
                      <div style={{
                        height: "100%", borderRadius: "4px",
                        width: `${val}%`,
                        background: `linear-gradient(90deg, ${getAttrColor(val)}99, ${getAttrColor(val)})`,
                        transition: "width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        boxShadow: val >= 80 ? `0 0 8px ${getAttrColor(val)}44` : "none",
                      }} />
                    </div>
                    <span style={{ ...styles.attrValue, color: getAttrColor(val) }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scout Report Card */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>🔍 Relatório do Observador</h3>
            {scoutReport ? (
              <div style={{
                fontSize: "12px",
                lineHeight: "1.6",
                color: "rgba(255, 255, 255, 0.85)",
                whiteSpace: "pre-wrap",
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "12px 14px",
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                {scoutReport}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "12px 0" }}>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center", lineHeight: "1.5" }}>
                  Você ainda não tem um relatório detalhado deste jogador de nosso departamento de observação.
                </p>
                <button
                  onClick={handleRequestReport}
                  disabled={scouting}
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", gap: "8px" }}
                >
                  {scouting ? (
                    <>
                      🌀 Analisando Jogador...
                    </>
                  ) : (
                    <>
                      🔍 Solicitar Relatório (R$ 5.000)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100%", display: "flex", flexDirection: "column",
    background: "var(--color-bg-primary)", overflow: "auto",
    padding: "20px 24px",
  },
  notFound: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100%", gap: "16px",
    color: "var(--color-text-muted)",
  },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: "20px", flexShrink: 0,
  },
  topBarRight: {
    display: "flex", gap: "8px",
  },
  tagYouth: {
    fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "12px",
    background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)",
  },
  tagPrime: {
    fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "12px",
    background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)",
  },
  tagVet: {
    fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "12px",
    background: "rgba(148,163,184,0.15)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.3)",
  },
  content: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px",
    flex: 1, minHeight: 0,
  },
  leftCol: {
    display: "flex", flexDirection: "column", gap: "16px",
  },
  rightCol: {
    display: "flex", flexDirection: "column", gap: "16px",
  },
  card: {
    background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
    borderRadius: "12px", padding: "20px",
  },
  cardHeader: {
    display: "flex", gap: "16px", alignItems: "center", marginBottom: "20px",
  },
  shirtCircle: {
    width: "64px", height: "64px", borderRadius: "50%",
    background: "linear-gradient(135deg, var(--color-bg-hover), var(--color-bg-card))",
    border: "2px solid var(--color-accent-primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  shirtNum: {
    fontSize: "26px", fontWeight: 900, color: "var(--color-accent-primary)",
  },
  playerName: {
    fontSize: "22px", fontWeight: 900, color: "var(--color-text-primary)",
    margin: 0, lineHeight: 1.2,
  },
  metaRow: {
    display: "flex", alignItems: "center", gap: "8px", marginTop: "6px",
  },
  metaText: {
    fontSize: "12px", color: "var(--color-text-secondary)",
  },
  clubTag: {
    display: "flex", alignItems: "center", gap: "6px", marginTop: "6px",
  },
  abilitySection: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px",
  },
  abilityCard: {
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "8px", padding: "14px 12px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
  },
  abilityLabel: {
    fontSize: "10px", color: "var(--color-text-muted)",
    textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600,
  },
  abilityNum: {
    fontSize: "28px", fontWeight: 900,
  },
  sectionTitle: {
    fontSize: "13px", fontWeight: 700, color: "var(--color-text-secondary)",
    margin: "0 0 14px 0",
  },
  contractGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px",
  },
  contractItem: {
    display: "flex", flexDirection: "column", gap: "4px",
  },
  contractLabel: {
    fontSize: "10px", color: "var(--color-text-muted)",
    textTransform: "uppercase", letterSpacing: "0.3px",
  },
  profileText: {
    fontSize: "12px", color: "var(--color-text-secondary)",
    lineHeight: 1.5, margin: 0,
  },
  fitnessBar: {
    width: "100%", height: "6px", borderRadius: "3px",
    background: "var(--color-bg-hover)", overflow: "hidden", marginTop: "8px",
  },
  fitnessBarFill: {
    height: "100%", borderRadius: "3px", transition: "width 0.6s ease",
  },
  attrRow: {
    display: "flex", alignItems: "center", gap: "10px",
  },
  attrIcon: {
    fontSize: "14px", width: "20px", textAlign: "center", flexShrink: 0,
  },
  attrLabel: {
    width: "90px", fontSize: "12px", color: "var(--color-text-secondary)",
    fontWeight: 500, flexShrink: 0,
  },
  attrBarOuter: {
    flex: 1, height: "10px", borderRadius: "5px",
    background: "var(--color-bg-hover)", overflow: "hidden",
  },
  attrValue: {
    width: "30px", textAlign: "right", fontSize: "14px",
    fontWeight: 800, flexShrink: 0,
  },
};
