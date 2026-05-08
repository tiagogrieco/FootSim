import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../context/GameContext";

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val}`;
}

export default function ClubView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playerClub, allClubs } = useGame();

  const clubId = id ? Number(id) : playerClub.id;
  const club = allClubs.find(c => c.id === clubId) || playerClub;

  if (!club) {
    return (
      <div style={styles.page}>
        <div style={styles.notFound}>
          <h2>Clube não encontrado</h2>
          <button className="btn-secondary" onClick={() => navigate(-1)}>← Voltar</button>
        </div>
      </div>
    );
  }

  const history = club.history || [];

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ fontSize: "13px" }}>
          ← Voltar
        </button>
        <div style={styles.topBarRight}>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>ID: {club.id}</span>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div
                style={{
                  ...styles.shield,
                  backgroundColor: club.colors.primary,
                  borderColor: club.colors.secondary,
                }}
              />
              <div style={styles.headerInfo}>
                <h1 style={styles.name}>{club.name}</h1>
                <div style={styles.subtitle}>
                  <span>{club.country}</span>
                  <span style={styles.dot}>•</span>
                  <span>{club.league}</span>
                </div>
              </div>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Reputação</span>
                <span style={styles.detailValue}>
                  {club.reputation} <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>/10000</span>
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Infraestrutura</span>
                <span style={styles.detailValue}>Nível {club.infrastructure}</span>
              </div>
              {club.id === playerClub.id && (
                <>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Orçamento</span>
                    <span style={{ ...styles.detailValue, color: "#10b981" }}>
                      {formatCurrency(club.budget)}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Orçamento Salarial</span>
                    <span style={styles.detailValue}>
                      {formatCurrency(club.wageBudget)}/mês
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={styles.rightCol}>
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Histórico do Clube</h2>
            
            {history.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🏆</div>
                <p>Nenhum registro histórico disponível.</p>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>O histórico é gerado ao final de cada temporada.</span>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Temp</th>
                      <th>Liga</th>
                      <th style={{ textAlign: "center" }}>Pos</th>
                      <th style={{ textAlign: "center" }}>Pts</th>
                      <th style={{ textAlign: "center" }}>V</th>
                      <th style={{ textAlign: "center" }}>E</th>
                      <th style={{ textAlign: "center" }}>D</th>
                      <th style={{ textAlign: "center" }}>GP</th>
                      <th style={{ textAlign: "center" }}>GC</th>
                      <th style={{ textAlign: "center" }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{h.season}</td>
                        <td>{h.league}</td>
                        <td style={{ textAlign: "center", fontWeight: "600", color: h.isChampion ? "#fbbf24" : "inherit" }}>
                          {h.position}º
                        </td>
                        <td style={{ textAlign: "center" }}>{h.points}</td>
                        <td style={{ textAlign: "center" }}>{h.won}</td>
                        <td style={{ textAlign: "center" }}>{h.drawn}</td>
                        <td style={{ textAlign: "center" }}>{h.lost}</td>
                        <td style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>{h.goalsFor}</td>
                        <td style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>{h.goalsAgainst}</td>
                        <td style={{ textAlign: "center" }}>
                          {h.isChampion && <span title="Campeão">🏆</span>}
                          {h.promoted && <span title="Promovido">📈</span>}
                          {h.relegated && <span title="Rebaixado">📉</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "24px",
    maxWidth: "1000px",
    margin: "0 auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  topBarRight: {
    display: "flex",
    gap: "8px",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "24px",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  },
  rightCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "16px",
    padding: "24px",
    backdropFilter: "blur(12px)",
  },
  sectionCard: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "16px",
    padding: "24px",
    backdropFilter: "blur(12px)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
    paddingBottom: "24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  shield: {
    width: "64px",
    height: "64px",
    borderRadius: "12px",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    margin: "0 0 6px 0",
    fontSize: "24px",
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "14px",
  },
  dot: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.3)",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "16px",
  },
  detailItem: {
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    padding: "12px 16px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  detailLabel: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  sectionTitle: {
    margin: "0 0 20px 0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#f8fafc",
  },
  tableWrapper: {
    overflowX: "auto" as const,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "14px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    borderRadius: "12px",
    border: "1px dashed rgba(255,255,255,0.1)",
    textAlign: "center" as const,
    color: "rgba(255,255,255,0.6)",
  },
  emptyIcon: {
    fontSize: "32px",
    marginBottom: "12px",
    opacity: 0.5,
  },
  notFound: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: "16px",
    color: "rgba(255,255,255,0.6)",
  },
};

// Add global styles for table in this component if needed
const globalStyles = `
  th {
    padding: 12px 16px;
    text-align: left;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    font-size: 13px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
  }
  tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}
