import { useState, useMemo, useEffect, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { getAttrColor, type InboxMessage } from "../types/game";
import { formatCurrency } from "../engine/financeEngine";
import { useNavigate } from "react-router-dom";
import { FORMATIONS, type Formation } from "../data/formations";
import { autoBuildLineup } from "../engine/autoLineupEngine";
import { useBoard } from "../context/BoardContext";
import OnboardingTutorial from "../components/OnboardingTutorial";

export default function Dashboard() {
  const {
    playerClub, playerSquad, standings, currentRound, lastMatchResult,
    advanceDay, simulatePlayerMatch, budget, seasonEndResult, allClubs, fixtures, currentDate,
    lastNotification, clearNotification, updateStartingLineup, staff,
    pendingEvent, chooseEventOption,
    inbox = [], activeBoardObjective = null, markMessageRead, replyToMessage
  } = useGame();

  const navigate = useNavigate();
  const [showPreMatch, setShowPreMatch] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem("footsim_tutorial_seen") !== "true";
  });
  const dismissTutorial = useCallback(() => {
    localStorage.setItem("footsim_tutorial_seen", "true");
    setShowTutorial(false);
  }, []);

  const leagueStandings = standings.filter(s => s.league === playerClub.league);
  const myStanding = leagueStandings.find(s => s.clubId === playerClub.id);
  const myPos = leagueStandings.findIndex(s => s.clubId === playerClub.id) + 1;

  const totalRounds = (allClubs.filter(c => c.league === playerClub.league).length - 1) * 2;
  const roundsRemaining = totalRounds - currentRound;
  const seasonOver = !!seasonEndResult;

  const avgCA = playerSquad.length
    ? Math.round(playerSquad.reduce((s, p) => s + p.currentAbility, 0) / playerSquad.length)
    : 0;

  // Format date
  const [year, month, day] = currentDate.split("-");
  const formattedDate = `${day}/${month}/${year}`;

  // Star player
  const starPlayer = [...playerSquad].sort((a, b) => b.currentAbility - a.currentAbility)[0];

  const strikingPlayers = useMemo(() => playerSquad.filter(p => (p.strikeDays ?? 0) > 0), [playerSquad]);
  const activePromisePlayers = useMemo(() => playerSquad.filter(p => (p.playtimePromiseMatches ?? 0) > 0), [playerSquad]);

  // Next match
  const nextFixture = fixtures.find(f => !f.played && (f.homeClubId === playerClub.id || f.awayClubId === playerClub.id));
  const isHome = nextFixture?.homeClubId === playerClub.id;
  const opponentClubId = isHome ? nextFixture?.awayClubId : nextFixture?.homeClubId;
  const opponentClub = allClubs.find(c => c.id === opponentClubId);
  const opponentStanding = opponentClub ? leagueStandings.findIndex(s => s.clubId === opponentClub.id) + 1 : 0;
  
  const isMatchDay = nextFixture?.date === currentDate;

  const handleAdvanceClick = () => {
    if (isMatchDay && opponentClub) {
      setShowPreMatch(true);
    } else {
      advanceDay();
    }
  };

  const { setPressHold } = useBoard();

  // Auto-reopen pre-match modal if returning from /tactics
  useEffect(() => {
    if (sessionStorage.getItem("footsim_return_to_prematch") === "1" && isMatchDay && opponentClub) {
      sessionStorage.removeItem("footsim_return_to_prematch");
      const id = setTimeout(() => setShowPreMatch(true), 0);
      return () => clearTimeout(id);
    }
  }, [isMatchDay, opponentClub]);

  const confirmMatch = () => {
    setShowPreMatch(false);
    setPressHold(true);          // segura coletiva enquanto vê o jogo
    simulatePlayerMatch();
    navigate("/game/match");
  };

  const formation: Formation = ((playerClub.formation as Formation) || "4-2-3-1");
  const formationSlots = FORMATIONS[formation] || FORMATIONS["4-2-3-1"];
  const headCoach = useMemo(() => staff.find(s => s.role === "headCoach" && s.hired) ?? null, [staff]);

  // Build lineup preview from playerClub.startingLineup
  const lineupPreview = useMemo(() => {
    const ids = playerClub.startingLineup ?? [];
    return formationSlots.map((slot, i) => {
      const id = ids[i];
      const player = id ? playerSquad.find(p => p.id === id) ?? null : null;
      return { slot, player };
    });
  }, [playerClub.startingLineup, playerSquad, formationSlots]);

  const lineupStats = useMemo(() => {
    const issues: string[] = [];
    let totalCA = 0;
    let countCA = 0;
    let injured = 0, suspended = 0, tired = 0, outOfPos = 0, empty = 0;
    for (const { slot, player } of lineupPreview) {
      if (!player) { empty++; issues.push(`Slot ${slot.position} vazio`); continue; }
      totalCA += player.currentAbility;
      countCA++;
      if ((player.injuryDays ?? 0) > 0) { injured++; issues.push(`${player.name} LESIONADO`); }
      if ((player.suspensionDays ?? 0) > 0) { suspended++; issues.push(`${player.name} SUSPENSO`); }
      if ((player.fitness ?? 100) < 65) { tired++; issues.push(`${player.name} fitness ${player.fitness}%`); }
      if (player.position !== slot.position) outOfPos++;
    }
    return {
      avgCA: countCA > 0 ? Math.round(totalCA / countCA) : 0,
      injured, suspended, tired, outOfPos, empty,
      issues: issues.slice(0, 5),
    };
  }, [lineupPreview]);

  const handleAutoLineup = () => {
    const result = autoBuildLineup(
      playerSquad,
      formationSlots.map(s => ({ position: s.position })),
      headCoach,
    );
    if (result.ids.length === formationSlots.length && result.ids.every(id => id !== 0)) {
      updateStartingLineup(result.ids);
    }
  };

  // Estimated from reputation as a proxy (we don't have other clubs' lineup logic here)
  const opponentAvgCA = (() => {
    if (!opponentClubId) return 0;
    const opp = allClubs.find(c => c.id === opponentClubId);
    return opp ? Math.round((opp.reputation ?? 5000) / 100) : 0;
  })();

  const favoriteTag = lineupStats.avgCA > opponentAvgCA + 5
    ? { text: "FAVORITO", color: "#10b981" }
    : lineupStats.avgCA < opponentAvgCA - 5
      ? { text: "AZARÃO", color: "#ef4444" }
      : { text: "EQUILIBRADO", color: "#f59e0b" };

  const posColor = (pos: number) => pos <= 4 ? "#10b981" : pos >= 8 ? "#ef4444" : "#f59e0b";

  return (
    <div style={styles.page}>
      {/* Top Bar — Actions */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <h1 style={styles.pageTitle}>Painel do Técnico</h1>
          <span style={styles.pageSub}>Temporada {seasonEndResult ? "Encerrada" : `em andamento • ${formattedDate}`}</span>
        </div>
        <div style={styles.topActions}>
          <button className="btn-primary" onClick={handleAdvanceClick} disabled={seasonOver} style={{ padding: "10px 28px" }}>
            {seasonOver ? "🏁 Encerrada" : isMatchDay ? `⚡ Jogar Partida` : `▶ Continuar (${formattedDate})`}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {lastNotification.type !== "none" && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", borderRadius: "8px", margin: "0 24px 12px",
          background: lastNotification.type === "match" ? "rgba(59,130,246,0.15)" : lastNotification.type === "offer" ? "rgba(245,158,11,0.15)" : "var(--color-bg-card)",
          border: `1px solid ${lastNotification.type === "match" ? "#3b82f6" : lastNotification.type === "offer" ? "#f59e0b" : "var(--color-border)"}`,
        }}>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>
            {lastNotification.type === "match" ? "⚡ " : lastNotification.type === "offer" ? "📨 " : "▶ "}
            {lastNotification.message}
          </span>
          <button onClick={clearNotification} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--color-text-muted)" }}>✕</button>
        </div>
      )}

      {/* Main Grid */}
      <div style={styles.mainGrid}>
        {/* Left Column */}
        <div style={styles.leftCol} className="stagger-children">

          {/* Next Match Card — Prominent */}
          {opponentClub && !seasonOver ? (
            <div style={styles.nextMatchCard}>
              <div style={styles.nextMatchHeader}>
                <span style={styles.sectionTag}>PRÓXIMO JOGO</span>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                  {isHome ? "🏠 Mandante" : "✈️ Visitante"} • {nextFixture?.date ? `${nextFixture.date.split("-")[2]}/${nextFixture.date.split("-")[1]}` : `Rodada ${nextFixture?.round}`}
                </span>
              </div>
              <div style={styles.vsContainer}>
                <div style={styles.vsTeam}>
                  <div style={{
                    ...styles.vsTeamBadge,
                    background: "var(--color-bg-secondary)",
                    border: `1px solid var(--color-border)`,
                    overflow: "hidden"
                  }}>
                    <img 
                      src={`${import.meta.env.BASE_URL}assets/clubs/logos/${playerClub.id}.png`}
                      alt={playerClub.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px" }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <span style={{ fontSize: "14px", fontWeight: 900, display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{playerClub.shortName}</span>
                  </div>
                  <span style={styles.vsTeamName}>{playerClub.name}</span>
                  <span style={{ ...styles.vsTeamPos, color: posColor(myPos) }}>{myPos}º — {myStanding?.points ?? 0}pts</span>
                </div>

                <div style={styles.vsMiddle}>
                  <span style={styles.vsText}>VS</span>
                </div>

                <div style={styles.vsTeam}>
                  <div style={{
                    ...styles.vsTeamBadge,
                    background: "var(--color-bg-secondary)",
                    border: `1px solid var(--color-border)`,
                    overflow: "hidden"
                  }}>
                    <img 
                      src={`${import.meta.env.BASE_URL}assets/clubs/logos/${opponentClub.id}.png`}
                      alt={opponentClub.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px" }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <span style={{ fontSize: "14px", fontWeight: 900, display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{opponentClub.shortName}</span>
                  </div>
                  <span style={styles.vsTeamName}>{opponentClub.name}</span>
                  <span style={{ ...styles.vsTeamPos, color: posColor(opponentStanding) }}>{opponentStanding}º — {leagueStandings.find(s => s.clubId === opponentClub.id)?.points ?? 0}pts</span>
                </div>
              </div>
              <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: "8px", background: isMatchDay ? "var(--color-accent-primary)" : "var(--color-bg-tertiary)" }} onClick={handleAdvanceClick}>
                {isMatchDay ? "⚡ Ir para o Jogo" : "📅 Simular até a partida"}
              </button>
            </div>
          ) : seasonOver ? (
            <div style={{ ...styles.nextMatchCard, borderTop: "3px solid var(--color-accent-secondary)" }}>
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <span style={{ fontSize: "32px" }}>🏁</span>
                <h3 style={{ fontSize: "16px", fontWeight: 800, marginTop: "8px" }}>Temporada Encerrada</h3>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>Confira o resultado final na modal de encerramento.</p>
              </div>
            </div>
          ) : null}

          {/* Last Match Result */}
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.sectionTag}>ÚLTIMO JOGO</span>
            </div>
            {lastMatchResult ? (
              <div style={styles.lastMatchContent}>
                <div style={styles.lastMatchTeam}>
                  <span style={styles.lastMatchName}>{lastMatchResult.homeClub.shortName}</span>
                  <span style={styles.lastMatchScore}>{lastMatchResult.homeGoals}</span>
                </div>
                <span style={{ fontSize: "14px", color: "var(--color-text-muted)", fontWeight: 800 }}>×</span>
                <div style={styles.lastMatchTeam}>
                  <span style={styles.lastMatchScore}>{lastMatchResult.awayGoals}</span>
                  <span style={styles.lastMatchName}>{lastMatchResult.awayClub.shortName}</span>
                </div>
              </div>
            ) : (
              <p style={styles.emptyText}>Nenhuma partida jogada</p>
            )}
          </div>

          {/* Quick Stats Row */}
          <div style={styles.statsRow}>
            <div className="stat-highlight">
              <span className="stat-highlight-value" style={{ color: "var(--color-accent-primary)" }}>{playerSquad.length}</span>
              <span className="stat-highlight-label">Jogadores</span>
            </div>
            <div className="stat-highlight">
              <span className="stat-highlight-value" style={{ color: getAttrColor(avgCA) }}>{avgCA}</span>
              <span className="stat-highlight-label">Média CA</span>
            </div>
            <div className="stat-highlight">
              <span className="stat-highlight-value" style={{ fontSize: "14px", color: budget >= 0 ? "#10b981" : "#ef4444" }}>{formatCurrency(budget)}</span>
              <span className="stat-highlight-label">Saldo</span>
            </div>
            <div className="stat-highlight">
              <span className="stat-highlight-value" style={{ color: "var(--color-accent-secondary)" }}>{roundsRemaining}</span>
              <span className="stat-highlight-label">Restantes</span>
            </div>
          </div>

          {/* Drama & Striking Players Warning Card */}
          {(strikingPlayers.length > 0 || activePromisePlayers.length > 0) && (
            <div className="card" style={{ ...styles.card, borderLeft: "4px solid #ef4444" }}>
              <div style={styles.cardHeader}>
                <span style={{ ...styles.sectionTag, color: "#ef4444" }}>⚠️ ATENÇÃO: DRAMAS NO VESTIÁRIO</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {strikingPlayers.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                    <div>
                      <strong>✊ {p.name}</strong> está em <span style={{ color: "#ef4444", fontWeight: 700 }}>GREVE</span>!
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Ele se recusa a jogar ou treinar por promessa não cumprida.</div>
                    </div>
                    <span style={{ fontSize: "11px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                      {p.strikeDays} dias
                    </span>
                  </div>
                ))}
                {activePromisePlayers.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                    <div>
                      <strong>🤝 Promessa a {p.name}</strong>
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        Titularidade em mais {p.playtimePromiseMatches} jogos (iniciou {p.playtimePromiseStarts ?? 0} até agora).
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                      Promessa Ativa
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Star Player */}
          {starPlayer && (
            <div className="card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.sectionTag}>⭐ CRAQUE DO ELENCO</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "4px 0" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "10px",
                  background: "linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: 900, color: "#fff", flexShrink: 0,
                }}>
                  {starPlayer.currentAbility}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{starPlayer.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    {starPlayer.positionCategory} • {starPlayer.age} anos • PA: {starPlayer.potentialAbility}
                  </div>
                </div>
                <button className="btn-icon" onClick={() => navigate(`/game/player/${starPlayer.id}`)} title="Ver perfil">
                  →
                </button>
              </div>
            </div>
          )}

          {/* Active Board Objective Card */}
          {activeBoardObjective && (
            <div className="card" style={{ ...styles.card, borderLeft: "4px solid var(--color-accent-secondary)" }}>
              <div style={styles.cardHeader}>
                <span style={styles.sectionTag}>🎯 META DA DIRETORIA</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>
                  {activeBoardObjective.description}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-muted)" }}>
                  <span>Jogos: {activeBoardObjective.gamesPlayed} / {activeBoardObjective.gamesLimit}</span>
                  <span>Pontos: {activeBoardObjective.pointsEarned} / {activeBoardObjective.targetPoints}</span>
                </div>
                <div style={{ width: "100%", height: "6px", background: "var(--color-bg-secondary)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, (activeBoardObjective.pointsEarned / activeBoardObjective.targetPoints) * 100)}%`,
                    height: "100%",
                    background: activeBoardObjective.pointsEarned >= activeBoardObjective.targetPoints ? "#10b981" : "var(--color-accent-secondary)",
                    borderRadius: "3px",
                    transition: "width 0.3s ease"
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Inbox / Correio Card */}
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.sectionTag}>📧 CORREIO ({inbox.filter(m => !m.read).length} não lidos)</span>
              <button className="btn-icon" onClick={() => navigate("/game/inbox")} title="Ir para a Caixa de Entrada" style={{ width: "24px", height: "24px", fontSize: "10px" }}>→</button>
            </div>
            {inbox.length === 0 ? (
              <p style={styles.emptyText}>Nenhuma mensagem na caixa de entrada</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {inbox.slice(0, 3).map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      markMessageRead(msg.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: msg.read ? "rgba(255,255,255,0.02)" : "rgba(59,130,246,0.08)",
                      border: msg.read ? "1px solid var(--color-border)" : "1px solid rgba(59,130,246,0.3)",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    className="hover-scale"
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, marginRight: "12px", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {!msg.read && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />}
                        <span style={{ fontSize: "12px", fontWeight: msg.read ? 600 : 800, color: msg.read ? "var(--color-text-muted)" : "var(--color-text)" }}>
                          {msg.sender}
                        </span>
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: msg.read ? 500 : 700, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {msg.subject}
                      </span>
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)", flexShrink: 0 }}>
                      {msg.date.split("-")[2]}/{msg.date.split("-")[1]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column — Mini Standings */}
        <div style={styles.rightCol}>
          <div className="card" style={{ ...styles.card, padding: "0", overflow: "hidden" }}>
            <div style={{ ...styles.cardHeader, padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
              <span style={styles.sectionTag}>🏆 CLASSIFICAÇÃO</span>
              <button className="btn-icon" onClick={() => navigate("/game/league")} title="Ver completa" style={{ width: "28px", height: "28px", fontSize: "12px" }}>→</button>
            </div>
            {leagueStandings.length > 0 ? (
              <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 28, textAlign: "center" }}>#</th>
                      <th>Clube</th>
                      <th style={{ width: 28, textAlign: "center" }}>J</th>
                      <th style={{ width: 28, textAlign: "center" }}>V</th>
                      <th style={{ width: 28, textAlign: "center" }}>E</th>
                      <th style={{ width: 28, textAlign: "center" }}>D</th>
                      <th style={{ width: 32, textAlign: "center" }}>SG</th>
                      <th style={{ width: 34, textAlign: "center" }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueStandings.map((s, i) => {
                      const isPlayer = s.clubId === playerClub.id;
                      return (
                        <tr key={s.clubId}
                          className={isPlayer ? "highlight-row" : ""}
                          style={{ fontWeight: isPlayer ? 700 : 400 }}
                        >
                          <td style={{ textAlign: "center", color: posColor(i + 1), fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <span style={{ fontWeight: isPlayer ? 800 : 500 }}>{s.clubShortName}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>{s.played}</td>
                          <td style={{ textAlign: "center", color: "#10b981" }}>{s.won}</td>
                          <td style={{ textAlign: "center", color: "#f59e0b" }}>{s.drawn}</td>
                          <td style={{ textAlign: "center", color: "#ef4444" }}>{s.lost}</td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                          <td style={{ textAlign: "center", fontWeight: 800, color: "var(--color-accent-primary)" }}>{s.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={styles.emptyText}>Inicie um Novo Jogo no menu</p>
            )}
          </div>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <button className="quick-action" onClick={() => navigate("/game/tactics")}>
              <span className="quick-action-icon">📋</span> Tática
            </button>
            <button className="quick-action" onClick={() => navigate("/game/squad")}>
              <span className="quick-action-icon">👥</span> Elenco
            </button>
            <button className="quick-action" onClick={() => navigate("/game/transfers")}>
              <span className="quick-action-icon">🔄</span> Mercado
            </button>
          </div>
        </div>
      </div>

      {/* Pre-Match Modal */}
      {showPreMatch && opponentClub && (
        <div style={styles.modalOverlay} onClick={() => setShowPreMatch(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "6px", textAlign: "center" }}>
              ⚽ Pré-Jogo: {formattedDate}
            </h2>
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginBottom: "24px", fontSize: "12px" }}>
              Análise do Adversário
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", padding: "0 16px" }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "10px", margin: "0 auto 8px",
                  background: "var(--color-bg-secondary)",
                  border: `1px solid var(--color-border)`,
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
                }}>
                  <img 
                    src={`${import.meta.env.BASE_URL}assets/clubs/logos/${(isHome ? playerClub : opponentClub).id}.png`}
                    alt={(isHome ? playerClub : opponentClub).name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 900, display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{isHome ? playerClub.shortName : opponentClub.shortName}</span>
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 800 }}>{isHome ? playerClub.shortName : opponentClub.shortName}</h3>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Mandante</span>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--color-text-muted)", padding: "0 16px" }}>VS</div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "10px", margin: "0 auto 8px",
                  background: "var(--color-bg-secondary)",
                  border: `1px solid var(--color-border)`,
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
                }}>
                  <img 
                    src={`${import.meta.env.BASE_URL}assets/clubs/logos/${(!isHome ? playerClub : opponentClub).id}.png`}
                    alt={(!isHome ? playerClub : opponentClub).name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 900, display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{!isHome ? playerClub.shortName : opponentClub.shortName}</span>
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 800 }}>{!isHome ? playerClub.shortName : opponentClub.shortName}</h3>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Visitante</span>
              </div>
            </div>

            {/* Favorite tag */}
            <div style={{
              textAlign: "center", marginBottom: 16,
              padding: "8px 14px", borderRadius: 8,
              background: `${favoriteTag.color}15`,
              border: `1px solid ${favoriteTag.color}40`,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              margin: "0 auto 16px", width: "fit-content",
              alignSelf: "center",
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: favoriteTag.color, textTransform: "uppercase" }}>
                Cenário: {favoriteTag.text}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                XI {lineupStats.avgCA} × {opponentAvgCA} aprox.
              </span>
            </div>

            {/* Sua escalação */}
            <div style={{ background: "var(--color-bg-secondary)", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-accent-primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  👥 Sua Escalação ({formation})
                </h4>
                <span style={{ fontSize: 12, fontWeight: 800, color: getAttrColor(lineupStats.avgCA) }}>
                  Força {lineupStats.avgCA}
                </span>
              </div>

              {/* Issue chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {lineupStats.empty > 0 && <IssueChip color="#ef4444" icon="⛔" label={`${lineupStats.empty} slot${lineupStats.empty > 1 ? "s" : ""} vazio${lineupStats.empty > 1 ? "s" : ""}`} />}
                {lineupStats.injured > 0 && <IssueChip color="#ef4444" icon="🏥" label={`${lineupStats.injured} lesionado${lineupStats.injured > 1 ? "s" : ""}`} />}
                {lineupStats.suspended > 0 && <IssueChip color="#ef4444" icon="🟥" label={`${lineupStats.suspended} suspenso${lineupStats.suspended > 1 ? "s" : ""}`} />}
                {lineupStats.tired > 0 && <IssueChip color="#f59e0b" icon="💤" label={`${lineupStats.tired} cansado${lineupStats.tired > 1 ? "s" : ""}`} />}
                {lineupStats.outOfPos > 0 && <IssueChip color="#f59e0b" icon="↔️" label={`${lineupStats.outOfPos} fora de posição`} />}
                {lineupStats.injured === 0 && lineupStats.suspended === 0 && lineupStats.tired === 0 && lineupStats.outOfPos === 0 && lineupStats.empty === 0 && (
                  <IssueChip color="#10b981" icon="✓" label="Tudo certo" />
                )}
              </div>

              {/* Mini pitch */}
              <div style={{
                position: "relative", width: "100%", aspectRatio: "16/10",
                background: "linear-gradient(180deg, #0a1a12 0%, #0e2818 100%)",
                borderRadius: 8, overflow: "hidden",
                backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 30px, transparent 30px, transparent 60px)",
                border: "1px solid var(--color-border)",
              }}>
                {lineupPreview.map(({ slot, player }, i) => {
                  const isProblem = !player ||
                    (player.injuryDays ?? 0) > 0 ||
                    (player.suspensionDays ?? 0) > 0 ||
                    (player.fitness ?? 100) < 65;
                  return (
                    <div key={i} style={{
                      position: "absolute",
                      left: `${slot.x}%`, top: `${slot.y}%`,
                      transform: "translate(-50%, -50%)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: !player ? "rgba(239,68,68,0.25)"
                          : isProblem ? "rgba(245,158,11,0.85)"
                          : "rgba(16,185,129,0.85)",
                        border: `1.5px solid ${!player ? "#ef4444" : isProblem ? "#f59e0b" : "#10b981"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 900, color: "#fff",
                      }}>
                        {player?.currentAbility ?? "—"}
                      </div>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: "#e8edf5",
                        textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                        maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {player?.name.split(" ").slice(-1)[0] ?? slot.position}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Relatório adversário */}
            <div style={{ background: "var(--color-bg-secondary)", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: 700, marginBottom: "12px", color: "var(--color-accent-primary)", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Relatório: {opponentClub.name}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Formação</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{opponentClub.formation}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Estilo</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, textTransform: "capitalize" }}>{opponentClub.mentality}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Reputação</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{opponentClub.reputation}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Posição</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{opponentStanding}º</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button className="btn-secondary" style={{ flex: 1, padding: "10px", minWidth: 90 }} onClick={() => setShowPreMatch(false)}>
                Voltar
              </button>
              <button
                onClick={() => {
                  setShowPreMatch(false);
                  sessionStorage.setItem("footsim_return_to_prematch", "1");
                  navigate("/game/tactics");
                }}
                style={{
                  flex: 1, minWidth: 110, padding: "10px",
                  borderRadius: 8, border: "1px solid var(--color-border)",
                  background: "var(--color-bg-card)", color: "var(--color-text-secondary)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)",
                }}
              >
                ✏️ Editar Táticas
              </button>
              <button
                onClick={handleAutoLineup}
                title={headCoach ? `${headCoach.name} (${headCoach.quality}/100)` : "Sem treinador"}
                style={{
                  flex: 1.2, minWidth: 130, padding: "10px",
                  borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  border: `1.5px solid ${headCoach ? "#10b981" : "#ef4444"}`,
                  background: headCoach
                    ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.06))"
                    : "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.06))",
                  color: headCoach ? "#10b981" : "#ef4444",
                }}
              >
                🧠 {headCoach ? `Pedir Treinador (${headCoach.quality})` : "Sem treinador"}
              </button>
              <button className="btn-primary" style={{ flex: 1.6, minWidth: 140, padding: "10px", fontSize: "13px" }} onClick={confirmMatch}>
                ⚡ Ir para o Jogo
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Event Modal */}
      {pendingEvent && (
        <div style={styles.modalOverlay}>
          <div style={{
            ...styles.modal,
            width: "560px",
            background: "linear-gradient(135deg, rgba(23, 28, 41, 0.95) 0%, rgba(13, 17, 26, 0.98) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            padding: "32px",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Ambient Background Glow */}
            <div style={{
              position: "absolute",
              top: "-50px",
              left: "-50px",
              width: "150px",
              height: "150px",
              background: "rgba(59, 130, 246, 0.15)",
              filter: "blur(60px)",
              borderRadius: "50%",
              pointerEvents: "none"
            }} />
            
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--color-accent-primary)",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "8px"
              }}>
                Acontecimento Extraordinário ⚠️
              </span>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                {pendingEvent.title}
              </h2>
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              padding: "18px",
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#d1d5db",
              marginBottom: "28px",
              textAlign: "center"
            }}>
              {pendingEvent.description}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendingEvent.options.map((opt, idx) => {
                const bChange = opt.effects.budgetChange;
                const mChange = opt.effects.moraleChange;
                const cChange = opt.effects.boardConfidenceChange;
                const pmChange = opt.effects.playerMoralChange;
                const xpBoost = opt.effects.xpBoost;
                const injury = opt.effects.injuryPlayer;

                return (
                  <button
                    key={idx}
                    onClick={() => chooseEventOption(idx)}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "10px",
                      padding: "16px 20px",
                      color: "#f3f4f6",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      transition: "all 0.2s ease",
                      outline: "none"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor = "var(--color-accent-primary)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                    }}
                  >
                    <div>{opt.text}</div>
                    
                    {/* Effects Preview */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "2px" }}>
                      {bChange !== undefined && bChange !== 0 && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: bChange > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: bChange > 0 ? "#10b981" : "#ef4444"
                        }}>
                          {bChange > 0 ? "+" : ""}{formatCurrency(bChange)}
                        </span>
                      )}
                      {mChange !== undefined && mChange !== 0 && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: mChange > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: mChange > 0 ? "#10b981" : "#ef4444"
                        }}>
                          👥 Moral: {mChange > 0 ? "+" : ""}{mChange}%
                        </span>
                      )}
                      {cChange !== undefined && cChange !== 0 && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: cChange > 0 ? "rgba(59, 130, 246, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: cChange > 0 ? "#3b82f6" : "#ef4444"
                        }}>
                          👔 Diretoria: {cChange > 0 ? "+" : ""}{cChange}%
                        </span>
                      )}
                      {pmChange !== undefined && pmChange.value !== 0 && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: pmChange.value > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: pmChange.value > 0 ? "#10b981" : "#ef4444"
                        }}>
                          👤 {pmChange.target === "star" ? "Estrela" : pmChange.target === "reserve" ? "Reserva" : "Jogador"}: {pmChange.value > 0 ? "+" : ""}{pmChange.value}% Moral
                        </span>
                      )}
                      {xpBoost !== undefined && xpBoost.value !== 0 && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(139, 92, 246, 0.15)",
                          color: "#8b5cf6"
                        }}>
                          ✨ XP: +{xpBoost.value} ({xpBoost.target === "all" ? "Todos" : "Aleatório"})
                        </span>
                      )}
                      {injury !== undefined && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b"
                        }}>
                          🏥 Risco Lesão ({Math.round(injury.probability * 100)}%)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selected Message Modal */}
      {selectedMessage && (
        <div style={styles.modalOverlay} onClick={() => setSelectedMessage(null)}>
          <div style={{ ...styles.modal, width: "550px", maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-accent-primary)", textTransform: "uppercase" }}>
                De: {selectedMessage.sender}
              </span>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                {selectedMessage.date.split("-")[2]}/{selectedMessage.date.split("-")[1]}/{selectedMessage.date.split("-")[0]}
              </span>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "16px" }}>{selectedMessage.subject}</h3>
            
            <div style={{
              fontSize: "13px", lineHeight: "1.6", color: "rgba(255,255,255,0.85)",
              maxHeight: "250px", overflowY: "auto", marginBottom: "20px",
              whiteSpace: "pre-wrap", borderBottom: "1px solid var(--color-border)", paddingBottom: "16px"
            }}>
              {selectedMessage.body}
            </div>

            {/* Actions inside modal */}
            {selectedMessage.actionRequired && !selectedMessage.actionCompleted && selectedMessage.actionOptions && (
              <div style={{ background: "var(--color-bg-secondary)", borderRadius: "8px", padding: "12px", border: "1px solid var(--color-border)", marginBottom: "16px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  ⚡ Decisão Requerida
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedMessage.actionOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        replyToMessage(selectedMessage.id, opt.id);
                        const optionSelected = selectedMessage.actionOptions?.find(o => o.id === opt.id);
                        if (optionSelected) {
                          setSelectedMessage({
                            ...selectedMessage,
                            body: selectedMessage.body + `\n\n--- Resposta Enviada ---\nVocê escolheu: "${optionSelected.replyText}"`,
                            actionRequired: false,
                            actionCompleted: true,
                          });
                        }
                      }}
                      style={{
                        padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--color-border)",
                        background: "var(--color-bg-card)", color: "var(--color-text)",
                        fontSize: "12px", fontWeight: 700, cursor: "pointer", textAlign: "left"
                      }}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setSelectedMessage(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
      {showTutorial && <OnboardingTutorial onClose={dismissTutorial} />}
    </div>
  );
}

function IssueChip({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: "3px 8px", borderRadius: 10,
      background: `${color}18`,
      color, border: `1px solid ${color}40`,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <span style={{ fontSize: 11 }}>{icon}</span> {label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "20px 24px", height: "100%", overflow: "auto" },
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px",
  },
  topLeft: { display: "flex", flexDirection: "column", gap: "2px" },
  pageTitle: { fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" },
  pageSub: { fontSize: "12px", color: "var(--color-text-muted)" },
  topActions: { display: "flex", gap: "8px" },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: "16px",
    alignItems: "start",
  },
  leftCol: { display: "flex", flexDirection: "column", gap: "12px" },
  rightCol: { display: "flex", flexDirection: "column", gap: "12px" },

  nextMatchCard: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderTop: "3px solid var(--color-accent-primary)",
    borderRadius: "var(--radius-md)",
    padding: "16px 20px",
    boxShadow: "var(--shadow-card)",
  },
  nextMatchHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px",
  },
  vsContainer: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
  },
  vsTeam: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
  },
  vsTeamBadge: {
    width: "52px", height: "52px", borderRadius: "12px",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  vsTeamName: { fontSize: "13px", fontWeight: 700, textAlign: "center" },
  vsTeamPos: { fontSize: "11px", fontWeight: 600 },
  vsMiddle: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "0 8px",
  },
  vsText: {
    fontSize: "18px", fontWeight: 900, color: "var(--color-text-muted)", letterSpacing: "2px",
  },

  card: { padding: "16px 20px" },
  cardHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px",
  },
  sectionTag: {
    fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)",
    textTransform: "uppercase", letterSpacing: "1px",
  },

  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px",
  },

  lastMatchContent: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "4px 0",
  },
  lastMatchTeam: { display: "flex", alignItems: "center", gap: "10px" },
  lastMatchName: { fontSize: "15px", fontWeight: 700 },
  lastMatchScore: { fontSize: "28px", fontWeight: 900, color: "var(--color-accent-primary)" },

  quickActions: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px",
  },

  emptyText: { color: "var(--color-text-muted)", fontSize: "12px", textAlign: "center", padding: "20px" },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "14px", padding: "28px", width: "480px", maxWidth: "90vw",
    boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
  },
};
