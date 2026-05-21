import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { formatCurrency } from "../engine/financeEngine";

export default function PresentationView() {
  const navigate = useNavigate();
  const { playerClub, playerSquad, budget } = useGame();

  if (!playerClub) {
    return null;
  }

  // Top 3 players by CA
  const topPlayers = [...playerSquad].sort((a, b) => b.currentAbility - a.currentAbility).slice(0, 3);
  const avgCA = playerSquad.length > 0
    ? Math.round(playerSquad.reduce((s, p) => s + p.currentAbility, 0) / playerSquad.length)
    : 0;

  // Expectations
  let expectation: string;
  let expectationIcon: string;
  if (playerClub.reputation >= 80) { expectation = "Lutar pelo Título"; expectationIcon = "🏆"; }
  else if (playerClub.reputation >= 65) { expectation = "Vaga Continental"; expectationIcon = "⭐"; }
  else if (playerClub.reputation >= 45) { expectation = "Meio de Tabela"; expectationIcon = "📊"; }
  else { expectation = "Evitar Rebaixamento"; expectationIcon = "🛡️"; }

  const primaryColor = playerClub.colors?.primary || "#111";
  const secondaryColor = playerClub.colors?.secondary || "#333";

  return (
    <div style={{
      ...styles.page,
      background: `radial-gradient(ellipse at 30% 20%, ${primaryColor}40 0%, transparent 50%),
                    radial-gradient(ellipse at 70% 80%, ${secondaryColor}30 0%, transparent 50%),
                    var(--color-bg-primary)`,
    }}>
      {/* Subtle pattern overlay */}
      <div style={styles.patternOverlay} />

      <div style={styles.content} className="stagger-children">

        {/* Header */}
        <div style={styles.header}>
          <div style={{
            ...styles.badge,
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            overflow: "hidden",
          }}>
            {playerClub.logoUrl ? (
              <img src={playerClub.logoUrl} alt={playerClub.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} />
            ) : (
              <img 
                src={`assets/clubs/logos/${playerClub.id}.png`} 
                alt={playerClub.shortName}
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            )}
            <span style={{ fontWeight: 900, fontSize: "28px", color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.4)", display: playerClub.logoUrl ? "none" : "none" }}>
              {playerClub.shortName}
            </span>
          </div>
          <div style={styles.headerText}>
            <h1 style={styles.title}>Bem-vindo ao {playerClub.name}</h1>
            <p style={styles.subtitle}>
              A diretoria tem o prazer de anunciar você como o novo treinador para a temporada.
            </p>
          </div>
        </div>

        {/* Main Info Grid */}
        <div style={styles.grid}>
          {/* Expectations Card */}
          <div style={{ ...styles.card, borderTop: "3px solid var(--color-accent-primary)" }}>
            <h3 style={styles.cardTitle}>{expectationIcon} Expectativas da Diretoria</h3>
            <div style={styles.expectationBig}>
              <span style={styles.expectationText}>{expectation}</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.statRows}>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Orçamento Inicial</span>
                <span style={styles.statValue}>{formatCurrency(budget)}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Folha Salarial</span>
                <span style={styles.statValue}>{formatCurrency(playerClub.wageBudget)} /sem</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Patrocinador</span>
                <span style={styles.statValue}>{playerClub.sponsor?.name || "Nenhum"}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Infraestrutura</span>
                <span style={styles.statValue}>{playerClub.infrastructure}/100</span>
              </div>
            </div>
          </div>

          {/* Squad Card */}
          <div style={{ ...styles.card, borderTop: "3px solid var(--color-accent-secondary)" }}>
            <h3 style={styles.cardTitle}>⚽ Visão do Elenco</h3>
            <div style={styles.squadStats}>
              <div className="stat-highlight">
                <span className="stat-highlight-value" style={{ color: "var(--color-accent-primary)" }}>{playerSquad.length}</span>
                <span className="stat-highlight-label">Jogadores</span>
              </div>
              <div className="stat-highlight">
                <span className="stat-highlight-value" style={{ color: "var(--color-accent-secondary)" }}>{avgCA}</span>
                <span className="stat-highlight-label">Média CA</span>
              </div>
              <div className="stat-highlight">
                <span className="stat-highlight-value" style={{ color: "var(--color-accent-info)" }}>{playerClub.reputation}</span>
                <span className="stat-highlight-label">Reputação</span>
              </div>
            </div>

            {/* Top 3 Players */}
            {topPlayers.length > 0 && (
              <>
                <div style={styles.divider} />
                <h4 style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                  ⭐ Destaques do Elenco
                </h4>
                <div style={styles.playerList}>
                  {topPlayers.map((p, i) => (
                    <div key={p.id} style={styles.playerRow}>
                      <div style={{
                        ...styles.playerRank,
                        background: i === 0 ? "linear-gradient(135deg, #f59e0b, #d97706)" :
                                    i === 1 ? "linear-gradient(135deg, #94a3b8, #64748b)" :
                                    "linear-gradient(135deg, #b45309, #92400e)",
                      }}>
                        <span style={{ fontSize: "10px", fontWeight: 900, color: "#fff" }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                          {p.positionCategory} • {p.age} anos
                        </div>
                      </div>
                      <div style={{
                        ...styles.playerCA,
                        background: p.currentAbility >= 75 ? "rgba(16, 185, 129, 0.15)" :
                                    p.currentAbility >= 60 ? "rgba(245, 158, 11, 0.15)" :
                                    "rgba(100, 116, 139, 0.15)",
                        color: p.currentAbility >= 75 ? "#10b981" :
                               p.currentAbility >= 60 ? "#f59e0b" : "var(--color-text-secondary)",
                      }}>
                        {p.currentAbility}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionContainer}>
          <button
            style={styles.actionBtn}
            onClick={() => navigate("/game")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.boxShadow = `0 12px 32px ${primaryColor}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
            }}
          >
            ⚡ ASSINAR CONTRATO E INICIAR
          </button>

          <button
            className="btn-secondary"
            style={{ marginTop: "16px", fontSize: "12px" }}
            onClick={() => navigate("/select-team")}
          >
            ← Voltar à Seleção de Clubes
          </button>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100%",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "auto",
  },
  patternOverlay: {
    position: "absolute",
    inset: 0,
    opacity: 0.02,
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.1) 60px, rgba(255,255,255,0.1) 61px),
                       repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.1) 60px, rgba(255,255,255,0.1) 61px)`,
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    zIndex: 2,
    maxWidth: "820px",
    width: "100%",
    padding: "40px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "28px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    width: "100%",
  },
  badge: {
    width: "80px",
    height: "80px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    flexShrink: 0,
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  title: {
    fontSize: "32px",
    fontWeight: 900,
    color: "#ffffff",
    letterSpacing: "-1px",
    margin: 0,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--color-text-muted)",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    width: "100%",
  },
  card: {
    background: "rgba(21, 29, 43, 0.8)",
    backdropFilter: "blur(16px)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#fff",
    margin: 0,
  },
  expectationBig: {
    padding: "10px 16px",
    background: "rgba(16, 185, 129, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(16, 185, 129, 0.15)",
    textAlign: "center",
  },
  expectationText: {
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--color-accent-primary)",
  },
  divider: {
    height: "1px",
    background: "var(--color-border)",
    margin: "4px 0",
  },
  statRows: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: "12px",
    color: "var(--color-text-muted)",
    fontWeight: 500,
  },
  statValue: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#fff",
  },
  squadStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  playerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 8px",
    background: "var(--color-bg-hover)",
    borderRadius: "6px",
  },
  playerRank: {
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  playerCA: {
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: 900,
  },
  actionContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "8px",
  },
  actionBtn: {
    padding: "16px 40px",
    fontSize: "16px",
    fontWeight: 900,
    color: "#fff",
    background: "var(--color-accent-primary)",
    border: "none",
    borderRadius: "100px",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    letterSpacing: "1px",
    fontFamily: "var(--font-sans)",
  },
};
