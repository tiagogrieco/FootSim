import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import type { Player, Club } from "../types/game";
import type { Fixture } from "../engine/leagueEngine";

interface LeaderEntry {
  player: Player;
  clubName: string;
  clubShort: string;
  clubId: number;
  value: number;
}

function buildLeaders(
  allSquads: Map<number, Player[]>,
  playerSquad: Player[],
  playerClubId: number,
  allClubs: { id: number; name: string; shortName: string; league?: string }[],
  leagueFilter: string,
  metric: (s: NonNullable<Player["seasonStats"]>) => number,
  minValue = 0,
): LeaderEntry[] {
  const entries: LeaderEntry[] = [];

  for (const [clubId, squad] of allSquads) {
    const club = allClubs.find(c => c.id === clubId);
    if (!club || club.league !== leagueFilter) continue;
    const actualSquad = clubId === playerClubId ? playerSquad : squad;
    for (const p of actualSquad) {
      if (!p.seasonStats) continue;
      const val = metric(p.seasonStats);
      if (val > minValue) {
        entries.push({ player: p, clubName: club.name, clubShort: club.shortName, clubId, value: val });
      }
    }
  }

  return entries.sort((a, b) => b.value - a.value).slice(0, 20);
}

export default function LeagueView() {
  const { standings, fixtures, allClubs, allSquads, playerClub, playerSquad, currentRound, cupFixtures } = useGame();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"standings" | "fixtures" | "results" | "stats" | "cup">("standings");
  const [statCategory, setStatCategory] = useState<"goals" | "assists" | "rating" | "motm">("goals");
  const [selectedLeague, setSelectedLeague] = useState<string>(playerClub.league || "Série A");

  const leagueStandings = useMemo(() => standings.filter(s => s.league === selectedLeague), [standings, selectedLeague]);
  const leagueFixtures = useMemo(() => fixtures.filter(f => f.league === selectedLeague), [fixtures, selectedLeague]);

  const playedFixtures = useMemo(
    () => leagueFixtures.filter(f => f.played).sort((a, b) => b.round - a.round),
    [leagueFixtures],
  );

  const upcomingFixtures = useMemo(
    () => leagueFixtures.filter(f => !f.played).sort((a, b) => a.round - b.round).slice(0, 20),
    [leagueFixtures],
  );


  const topScorers = useMemo(() =>
    buildLeaders(allSquads, playerSquad, playerClub.id, allClubs as Club[], selectedLeague, s => s.goals),
    [allSquads, playerSquad, playerClub, allClubs, selectedLeague],
  );

  const topAssisters = useMemo(() =>
    buildLeaders(allSquads, playerSquad, playerClub.id, allClubs as Club[], selectedLeague, s => s.assists),
    [allSquads, playerSquad, playerClub, allClubs, selectedLeague],
  );

  const topRated = useMemo(() =>
    buildLeaders(allSquads, playerSquad, playerClub.id, allClubs as Club[], selectedLeague, s => s.appearances > 0 ? s.avgRating : 0, 0.1),
    [allSquads, playerSquad, playerClub, allClubs, selectedLeague],
  );

  const topMotm = useMemo(() =>
    buildLeaders(allSquads, playerSquad, playerClub.id, allClubs as Club[], selectedLeague, s => s.motm),
    [allSquads, playerSquad, playerClub, allClubs, selectedLeague],
  );

  const activeLeaders = statCategory === "goals" ? topScorers
    : statCategory === "assists" ? topAssisters
    : statCategory === "rating" ? topRated
    : topMotm;

  const statLabel = statCategory === "goals" ? "Gols"
    : statCategory === "assists" ? "Assists"
    : statCategory === "rating" ? "Rating"
    : "MOTM";

  const getClubFull = (id: number) => allClubs.find(c => c.id === id)?.name || "???";

  const statCategories = [
    { key: "goals" as const, label: "Artilheiros", icon: "⚽", color: "#10b981" },
    { key: "assists" as const, label: "Assistências", icon: "🅰️", color: "#3b82f6" },
    { key: "rating" as const, label: "Rating", icon: "⭐", color: "#f59e0b" },
    { key: "motm" as const, label: "MOTM", icon: "🏆", color: "#f59e0b" },
  ];

  const allLeagues = useMemo(() => Array.from(new Set(allClubs.map(c => c.league))).sort(), [allClubs]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏆 Campeonato — {selectedLeague} {new Date().getFullYear()}</h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={styles.leagueSelector}>
            {allLeagues.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLeague(l)}
                style={{
                  ...styles.leagueBtn,
                  ...(selectedLeague === l ? styles.leagueBtnActive : {}),
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <span style={styles.roundBadge}>Rodada {currentRound}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {([
          { key: "standings", label: "Classificação", icon: "📊" },
          { key: "stats", label: "Estatísticas", icon: "🏅" },
          { key: "results", label: "Resultados", icon: "⚽" },
          { key: "fixtures", label: "Próximos Jogos", icon: "📅" },
        { key: "cup", label: "Copa do Brasil", icon: "🏆" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Standings */}
      {activeTab === "standings" && (
        <div className="card" style={styles.card}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 35 }}>#</th>
                <th>Clube</th>
                <th style={{ width: 35 }}>J</th>
                <th style={{ width: 35 }}>V</th>
                <th style={{ width: 35 }}>E</th>
                <th style={{ width: 35 }}>D</th>
                <th style={{ width: 40 }}>GP</th>
                <th style={{ width: 40 }}>GC</th>
                <th style={{ width: 40 }}>SG</th>
                <th style={{ width: 45 }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {leagueStandings.map((s, i) => {
                const isPlayer = s.clubId === playerClub.id;
                let zoneColor = "var(--color-text-muted)";
                if (selectedLeague === "Série A") {
                  if (i < 4) zoneColor = "#10b981";
                  else if (i >= leagueStandings.length - 2) zoneColor = "#ef4444";
                } else if (selectedLeague === "Série B") {
                  if (i < 2) zoneColor = "#10b981";
                }

                return (
                  <tr key={s.clubId} style={{
                    background: isPlayer ? "var(--color-bg-active)" : undefined,
                    fontWeight: isPlayer ? 700 : 400,
                  }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "3px", height: "18px", borderRadius: "2px", background: zoneColor }} />
                        <span style={{ color: zoneColor, fontWeight: 700 }}>{i + 1}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <img 
                            src={`/assets/clubs/logos/${s.clubId}.png`} 
                            alt={s.clubShortName}
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                              }
                            }}
                          />
                          <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--color-text-muted)", display: "none" }}>
                            {s.clubShortName}
                          </span>
                        </div>
                        <span
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/game/club/${s.clubId}`)}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent-primary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                        >{s.clubName}</span>
                        {isPlayer && <span style={{ fontSize: "10px" }}>⭐</span>}
                      </div>
                    </td>
                    <td>{s.played}</td>
                    <td style={{ color: "#10b981" }}>{s.won}</td>
                    <td style={{ color: "#f59e0b" }}>{s.drawn}</td>
                    <td style={{ color: "#ef4444" }}>{s.lost}</td>
                    <td>{s.goalsFor}</td>
                    <td>{s.goalsAgainst}</td>
                    <td style={{ fontWeight: 700 }}>
                      {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                    </td>
                    <td style={{ fontWeight: 900, color: "var(--color-accent-primary)", fontSize: "15px" }}>
                      {s.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Zone Legend */}
          <div style={styles.legend}>
            {selectedLeague === "Série A" ? (
              <>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "#10b981" }} />
                  <span>Copa Continental (1º-4º)</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "#ef4444" }} />
                  <span>Rebaixamento (Últimos 2)</span>
                </div>
              </>
            ) : selectedLeague === "Série B" ? (
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, background: "#10b981" }} />
                <span>Zona de Promoção (1º-2º)</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Stat Category Selector */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {statCategories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setStatCategory(cat.key)}
                style={{
                  ...styles.statCatBtn,
                  ...(statCategory === cat.key ? { background: cat.color, borderColor: cat.color, color: "#fff" } : {}),
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Leaders Table */}
          <div className="card" style={styles.card}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              {statCategories.find(c => c.key === statCategory)?.icon} Líderes — {statLabel}
            </h3>
            {activeLeaders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
                <p style={{ fontSize: "14px" }}>Nenhuma estatística registrada ainda.</p>
                <p style={{ fontSize: "12px", marginTop: "4px" }}>Avance rodadas para ver os rankings!</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 35 }}>#</th>
                    <th>Jogador</th>
                    <th style={{ width: 60 }}>Pos</th>
                    <th>Clube</th>
                    <th style={{ width: 50 }}>J</th>
                    <th style={{ width: 60 }}>{statLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLeaders.map((entry, i) => {
                    const isPlayerClub = entry.clubId === playerClub.id;
                    const medalColor = i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#d97706" : "var(--color-text-muted)";
                    const categoryColor = statCategories.find(c => c.key === statCategory)?.color || "#10b981";

                    return (
                      <tr key={`${entry.player.id}-${i}`} style={{
                        background: isPlayerClub ? "var(--color-bg-active)" : undefined,
                      }}>
                        <td>
                          <span style={{
                            fontWeight: 900,
                            fontSize: i < 3 ? "15px" : "13px",
                            color: medalColor,
                          }}>
                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary)" }}
                            onClick={() => navigate(`/game/player/${entry.player.id}`)}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent-primary)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                          >
                            {entry.player.name}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${entry.player.position === "GK" ? "gk" : entry.player.position === "ST" || entry.player.position === "CF" || entry.player.position === "LW" || entry.player.position === "RW" ? "fwd" : ["CB", "LB", "RB"].includes(entry.player.position) ? "def" : "mid"}`}>
                            {entry.player.position}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <img 
                                src={`/assets/clubs/logos/${entry.clubId}.png`} 
                                alt={entry.clubShort}
                                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                                  }
                                }}
                              />
                              <span style={{ fontWeight: 700, fontSize: "11px", color: "var(--color-text-muted)", display: "none" }}>
                                {entry.clubShort}
                              </span>
                            </div>
                            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                              {entry.clubName}
                            </span>
                            {isPlayerClub && <span style={{ fontSize: "10px" }}>⭐</span>}
                          </div>
                        </td>
                        <td style={{ color: "var(--color-text-muted)" }}>
                          {entry.player.seasonStats?.appearances || 0}
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 900,
                            fontSize: i < 3 ? "16px" : "14px",
                            color: categoryColor,
                          }}>
                            {statCategory === "rating" ? entry.value.toFixed(1) : entry.value}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Summary Cards */}
          {topScorers.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
              {statCategories.map(cat => {
                const leaders = cat.key === "goals" ? topScorers
                  : cat.key === "assists" ? topAssisters
                  : cat.key === "rating" ? topRated
                  : topMotm;
                const leader = leaders[0];
                if (!leader) return (
                  <div key={cat.key} className="card" style={styles.summaryCard}>
                    <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600 }}>{cat.label}</span>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>—</span>
                  </div>
                );
                return (
                  <div
                    key={cat.key}
                    className="card"
                    style={{
                      ...styles.summaryCard,
                      borderTop: `3px solid ${cat.color}`,
                      cursor: "pointer",
                    }}
                    onClick={() => setStatCategory(cat.key)}
                  >
                    <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                    <span style={{ fontSize: "20px", fontWeight: 900, color: cat.color }}>
                      {cat.key === "rating" ? leader.value.toFixed(1) : leader.value}
                    </span>
                    <span style={{
                      fontSize: "12px", fontWeight: 700, color: "var(--color-text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
                    }}>
                      {leader.player.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img 
                          src={`/assets/clubs/logos/${leader.clubId}.png`} 
                          alt={leader.clubShort}
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                            }
                          }}
                        />
                        <span style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "none" }}>
                          {leader.clubShort}
                        </span>
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                        {leader.clubName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "cup" && (
        <div style={styles.fixtureGrid}>
          {cupFixtures.length === 0 ? (
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ color: "var(--color-text-muted)" }}>🏆 Copa do Brasil começa em Abril</p>
            </div>
          ) : (
            cupFixtures.map((f: Fixture, i: number) => {
              const home = allClubs.find(c => c.id === f.homeClubId);
              const away = allClubs.find(c => c.id === f.awayClubId);
              if (!home || !away) return null;
              const isPlayerGame = f.homeClubId === playerClub.id || f.awayClubId === playerClub.id;
              return (
                <div key={i} className="card" style={{ ...styles.fixtureCard, borderLeft: isPlayerGame ? "3px solid #f59e0b" : undefined }}>
                  <span style={styles.roundLabel}>R{f.round}</span>
                  <div style={styles.fixtureTeams}>
                    <span style={styles.fixTeam}>{home.shortName}</span>
                    <div style={styles.fixtureScore}>
                      {f.played && f.result ? (
                        <>
                          <span style={styles.scoreNum}>{f.result.homeGoals}</span>
                          <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>×</span>
                          <span style={styles.scoreNum}>{f.result.awayGoals}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{f.date?.split("-")[2]}/{f.date?.split("-")[1]}</span>
                      )}
                    </div>
                    <span style={{ ...styles.fixTeam, textAlign: "right" }}>{away.shortName}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "results" && (
        <div style={styles.fixtureGrid}>
          {playedFixtures.length === 0 ? (
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ color: "var(--color-text-muted)" }}>Nenhum jogo realizado ainda</p>
            </div>
          ) : (
            playedFixtures.map((f, i) => {
              const isPlayerGame = f.homeClubId === playerClub.id || f.awayClubId === playerClub.id;
              return (
                <div
                  key={i}
                  className="card"
                  style={{
                    ...styles.fixtureCard,
                    ...(isPlayerGame ? { borderLeft: "3px solid var(--color-accent-primary)" } : {}),
                  }}
                >
                  <span style={styles.roundLabel}>R{f.round}</span>
                  <div style={styles.fixtureTeams}>
                    <div style={{
                      ...styles.fixTeam,
                      display: "flex", alignItems: "center", justifyContent: "flex-end",
                      fontWeight: f.result && f.result.homeGoals > f.result.awayGoals ? 800 : 400,
                    }}>
                      {getClubFull(f.homeClubId)}
                      <img src={`/assets/clubs/logos/${f.homeClubId}.png`} style={{ width: "24px", height: "24px", objectFit: "contain", marginLeft: "8px" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div style={styles.fixtureScore}>
                      <span style={styles.scoreNum}>{f.result?.homeGoals}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>×</span>
                      <span style={styles.scoreNum}>{f.result?.awayGoals}</span>
                    </div>
                    <div style={{
                      ...styles.fixTeam,
                      display: "flex", alignItems: "center", justifyContent: "flex-start",
                      fontWeight: f.result && f.result.awayGoals > f.result.homeGoals ? 800 : 400,
                    }}>
                      <img src={`/assets/clubs/logos/${f.awayClubId}.png`} style={{ width: "24px", height: "24px", objectFit: "contain", marginRight: "8px" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      {getClubFull(f.awayClubId)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "fixtures" && (
        <div style={styles.fixtureGrid}>
          {upcomingFixtures.length === 0 ? (
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ color: "var(--color-text-muted)" }}>Todos os jogos foram realizados!</p>
            </div>
          ) : (
            upcomingFixtures.map((f, i) => {
              const isPlayerGame = f.homeClubId === playerClub.id || f.awayClubId === playerClub.id;
              return (
                <div
                  key={i}
                  className="card"
                  style={{
                    ...styles.fixtureCard,
                    ...(isPlayerGame ? { borderLeft: "3px solid var(--color-accent-primary)" } : {}),
                  }}
                >
                  <span style={styles.roundLabel}>R{f.round}</span>
                  <div style={styles.fixtureTeams}>
                    <div style={{ ...styles.fixTeam, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      {getClubFull(f.homeClubId)}
                      <img src={`/assets/clubs/logos/${f.homeClubId}.png`} style={{ width: "24px", height: "24px", objectFit: "contain", marginLeft: "8px" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <span style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>vs</span>
                    <div style={{ ...styles.fixTeam, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                      <img src={`/assets/clubs/logos/${f.awayClubId}.png`} style={{ width: "24px", height: "24px", objectFit: "contain", marginRight: "8px" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      {getClubFull(f.awayClubId)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflow: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title: { fontSize: "24px", fontWeight: 800 },
  leagueSelector: {
    display: "flex", background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "20px", overflow: "hidden",
  },
  leagueBtn: {
    padding: "6px 16px", fontSize: "12px", fontWeight: 700, background: "transparent",
    color: "var(--color-text-secondary)", border: "none", cursor: "pointer", transition: "all 0.15s",
  },
  leagueBtnActive: {
    background: "var(--color-accent-primary)", color: "#fff",
  },
  roundBadge: {
    fontSize: "13px", fontWeight: 700, color: "var(--color-accent-primary)",
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    padding: "6px 16px", borderRadius: "20px",
  },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: {
    padding: "8px 18px", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 600,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "var(--color-accent-primary)", borderColor: "var(--color-accent-primary)", color: "#fff",
  },
  card: { padding: "20px" },
  legend: { display: "flex", gap: "24px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--color-border)" },
  legendItem: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--color-text-muted)" },
  legendDot: { width: "8px", height: "8px", borderRadius: "2px" },
  fixtureGrid: { display: "flex", flexDirection: "column", gap: "6px" },
  fixtureCard: { padding: "12px 16px", display: "flex", alignItems: "center", gap: "16px" },
  roundLabel: { fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", width: "32px", flexShrink: 0 },
  fixtureTeams: { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  fixTeam: { flex: 1, fontSize: "13px", color: "var(--color-text-primary)" },
  fixtureScore: { display: "flex", alignItems: "center", gap: "8px" },
  scoreNum: { fontSize: "18px", fontWeight: 900, color: "var(--color-accent-primary)", width: "20px", textAlign: "center" },
  statCatBtn: {
    padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 600,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
  },
  summaryCard: {
    padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center",
    gap: "4px", textAlign: "center",
  },
};
