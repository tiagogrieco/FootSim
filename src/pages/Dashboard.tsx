import { useState } from "react";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";
import { formatCurrency } from "../engine/financeEngine";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const {
    playerClub, playerSquad, standings, currentRound, lastMatchResult,
    advanceRound, advanceMonth, budget, seasonEndResult, allClubs, fixtures
  } = useGame();
  
  const navigate = useNavigate();
  const [showPreMatch, setShowPreMatch] = useState(false);

  const myStanding = standings.find(s => s.clubId === playerClub.id);
  const myPos = standings.findIndex(s => s.clubId === playerClub.id) + 1;

  const totalRounds = (allClubs.length - 1) * 2;
  const roundsRemaining = totalRounds - currentRound;
  const seasonOver = !!seasonEndResult;

  const avgCA = playerSquad.length
    ? Math.round(playerSquad.reduce((s, p) => s + p.currentAbility, 0) / playerSquad.length)
    : 0;

  // Next match logic
  const nextFixture = fixtures.find(f => f.round === currentRound + 1 && (f.homeClubId === playerClub.id || f.awayClubId === playerClub.id));
  const isHome = nextFixture?.homeClubId === playerClub.id;
  const opponentClubId = isHome ? nextFixture?.awayClubId : nextFixture?.homeClubId;
  const opponentClub = allClubs.find(c => c.id === opponentClubId);

  const handleAdvanceClick = () => {
    if (nextFixture && opponentClub) {
      setShowPreMatch(true);
    } else {
      // If no next match (e.g. season over or error), just advance
      advanceRound();
    }
  };

  const confirmMatch = () => {
    setShowPreMatch(false);
    advanceRound();
    navigate("/game/match");
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <div style={styles.actions}>
          <button className="btn-primary" onClick={handleAdvanceClick} disabled={seasonOver}>
            {seasonOver ? "🏁 Temporada Encerrada" : `▶ Avançar Rodada (${roundsRemaining} restantes)`}
          </button>
          <button className="btn-secondary" onClick={advanceMonth}>
            📅 Avançar Mês (Treino)
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Club Status */}
        <div className="card" style={styles.card}>
          <h3 style={styles.cardTitle}>📊 Status do Clube</h3>
          <div style={styles.statGrid}>
            <div style={styles.stat}>
              <span style={styles.statNum}>{playerSquad.length}</span>
              <span style={styles.statDesc}>Jogadores</span>
            </div>
            <div style={styles.stat}>
              <span style={{ ...styles.statNum, color: getAttrColor(avgCA) }}>{avgCA}</span>
              <span style={styles.statDesc}>Média CA</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNum}>{playerClub.formation}</span>
              <span style={styles.statDesc}>Formação</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNum}>{playerClub.mentality}</span>
              <span style={styles.statDesc}>Mentalidade</span>
            </div>
            <div style={styles.stat}>
              <span style={{ ...styles.statNum, fontSize: "16px", color: budget >= 0 ? "#10b981" : "#ef4444" }}>
                {formatCurrency(budget)}
              </span>
              <span style={styles.statDesc}>Saldo</span>
            </div>
          </div>
        </div>

        {/* League Position */}
        <div className="card" style={styles.card}>
          <h3 style={styles.cardTitle}>🏆 Classificação</h3>
          {myStanding ? (
            <div style={styles.leagueInfo}>
              <div style={styles.bigPosition}>
                <span style={{
                  fontSize: "48px",
                  fontWeight: 900,
                  color: myPos <= 4 ? "#10b981" : myPos >= 8 ? "#ef4444" : "#f59e0b",
                }}>
                  {myPos}º
                </span>
              </div>
              <div style={styles.leagueStats}>
                <span>{myStanding.played} jogos</span>
                <span style={{ color: "#10b981" }}>{myStanding.won}V</span>
                <span style={{ color: "#f59e0b" }}>{myStanding.drawn}E</span>
                <span style={{ color: "#ef4444" }}>{myStanding.lost}D</span>
                <span>{myStanding.points} pts</span>
              </div>
            </div>
          ) : (
            <p style={styles.emptyText}>Campeonato não iniciado</p>
          )}
        </div>

        {/* Last Match */}
        <div className="card" style={styles.card}>
          <h3 style={styles.cardTitle}>⚽ Último Jogo</h3>
          {lastMatchResult ? (
            <div style={styles.matchResult}>
              <div style={styles.matchTeam}>
                <span style={styles.matchName}>{lastMatchResult.homeClub.shortName}</span>
                <span style={styles.matchScore}>{lastMatchResult.homeGoals}</span>
              </div>
              <span style={styles.matchVs}>×</span>
              <div style={styles.matchTeam}>
                <span style={styles.matchScore}>{lastMatchResult.awayGoals}</span>
                <span style={styles.matchName}>{lastMatchResult.awayClub.shortName}</span>
              </div>
            </div>
          ) : (
            <p style={styles.emptyText}>Nenhuma partida jogada</p>
          )}
        </div>

        {/* Mini Standings */}
        <div className="card" style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <h3 style={styles.cardTitle}>📋 Tabela</h3>
          {standings.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Clube</th>
                  <th style={{ width: 30 }}>J</th>
                  <th style={{ width: 30 }}>V</th>
                  <th style={{ width: 30 }}>E</th>
                  <th style={{ width: 30 }}>D</th>
                  <th style={{ width: 40 }}>GP</th>
                  <th style={{ width: 40 }}>GC</th>
                  <th style={{ width: 40 }}>SG</th>
                  <th style={{ width: 40 }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr
                    key={s.clubId}
                    style={{
                      background: s.clubId === playerClub.id ? "var(--color-bg-active)" : undefined,
                      fontWeight: s.clubId === playerClub.id ? 700 : 400,
                    }}
                  >
                    <td style={{ color: i < 4 ? "#10b981" : i >= 8 ? "#ef4444" : "var(--color-text-muted)" }}>{i + 1}</td>
                    <td>{s.clubShortName} — {s.clubName}</td>
                    <td>{s.played}</td>
                    <td style={{ color: "#10b981" }}>{s.won}</td>
                    <td style={{ color: "#f59e0b" }}>{s.drawn}</td>
                    <td style={{ color: "#ef4444" }}>{s.lost}</td>
                    <td>{s.goalsFor}</td>
                    <td>{s.goalsAgainst}</td>
                    <td style={{ fontWeight: 600 }}>{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                    <td style={{ fontWeight: 700, color: "var(--color-accent-primary)" }}>{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={styles.emptyText}>Inicie um Novo Jogo no menu</p>
          )}
        </div>
      </div>

      {/* Pre-Match Modal */}
      {showPreMatch && opponentClub && (
        <div style={styles.modalOverlay} onClick={() => setShowPreMatch(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "8px", textAlign: "center" }}>
              Pré-Jogo: Rodada {currentRound + 1}
            </h2>
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Análise do Adversário
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", padding: "0 20px" }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <h3 style={{ fontSize: "20px", fontWeight: 800 }}>{isHome ? playerClub.shortName : opponentClub.shortName}</h3>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Mandante</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--color-text-muted)", padding: "0 20px" }}>
                VS
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <h3 style={{ fontSize: "20px", fontWeight: 800 }}>{!isHome ? playerClub.shortName : opponentClub.shortName}</h3>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Visitante</span>
              </div>
            </div>

            <div style={{ background: "var(--color-bg-secondary)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--color-accent-primary)", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>
                Relatório de Escotismo: {opponentClub.name}
              </h4>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Formação Favorita</div>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>{opponentClub.formation}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Estilo de Jogo</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, textTransform: "capitalize" }}>{opponentClub.mentality}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Reputação</div>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>{opponentClub.reputation}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Posição na Liga</div>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>
                    {standings.findIndex(s => s.clubId === opponentClub.id) + 1}º
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-secondary" style={{ flex: 1, padding: "12px" }} onClick={() => setShowPreMatch(false)}>
                Voltar à Tática
              </button>
              <button className="btn-primary" style={{ flex: 2, padding: "12px", fontSize: "15px" }} onClick={confirmMatch}>
                ⚽ Ir para o Jogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflow: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { fontSize: "24px", fontWeight: 800 },
  actions: { display: "flex", gap: "10px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" },
  card: { padding: "20px" },
  cardTitle: { fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--color-text-secondary)" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  statNum: { fontSize: "24px", fontWeight: 900, color: "var(--color-accent-primary)" },
  statDesc: { fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" },
  leagueInfo: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" },
  bigPosition: { textAlign: "center" },
  leagueStats: { display: "flex", gap: "12px", fontSize: "13px", color: "var(--color-text-secondary)" },
  matchResult: { display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" },
  matchTeam: { display: "flex", alignItems: "center", gap: "10px" },
  matchName: { fontSize: "16px", fontWeight: 700 },
  matchScore: { fontSize: "32px", fontWeight: 900, color: "var(--color-accent-primary)" },
  matchVs: { fontSize: "20px", color: "var(--color-text-muted)" },
  emptyText: { color: "var(--color-text-muted)", fontSize: "13px", textAlign: "center", padding: "20px" },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "16px", padding: "32px", width: "500px", maxWidth: "90vw",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
  },
};
