import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import type { MatchEvent } from "../engine/matchEngine";
import GoalCelebration from "../components/GoalCelebration";
import { startCrowd, stopCrowd, setIntensity, goalBurst, whistle } from "../lib/crowdAudio";
import { useBoard } from "../context/BoardContext";

export type SimState = "idle" | "running" | "paused" | "finished";
type Speed = 0.5 | 1 | 2 | 5 | 10;

function getEventIcon(type: MatchEvent["type"]): string {
  const icons: Record<MatchEvent["type"], string> = {
    goal: "⚽", yellow_card: "🟨", red_card: "🟥",
    substitution: "🔄", injury: "🏥", chance: "💨",
    save: "🧤", miss: "💨", foul: "⚠️", corner: "🚩",
    kickoff: "📢", halftime: "⏸️", fulltime: "🏁",
    penalty: "🎯", counter_attack: "⚡",
  };
  return icons[type] || "📝";
}

function getEventGlow(type: MatchEvent["type"]): string {
  if (type === "goal") return "rgba(16,185,129,0.25)";
  if (type === "red_card") return "rgba(239,68,68,0.2)";
  if (type === "yellow_card") return "rgba(245,158,11,0.15)";
  if (type === "injury") return "rgba(239,68,68,0.18)";
  if (type === "substitution") return "rgba(59,130,246,0.15)";
  if (type === "halftime" || type === "fulltime" || type === "kickoff") return "rgba(99,102,241,0.15)";
  return "transparent";
}

// Track which match was already fully simulated so we don't replay on re-mount
const seenMatchIds = new Set<string>();
function getMatchKey(m: { homeClub: { id: number }; awayClub: { id: number }; homeGoals: number; awayGoals: number }) {
  return `${m.homeClub.id}-${m.awayClub.id}-${m.homeGoals}-${m.awayGoals}`;
}

export default function MatchView() {
  const { lastMatchResult, matchHistory, playerClub } = useGame();
  const { setPressHold, releasePress } = useBoard();
  const navigate = useNavigate();
  const match = lastMatchResult;

  // Check if this match was already seen in this session
  const alreadySeen = match ? seenMatchIds.has(getMatchKey(match)) : false;

  const [simState, setSimState] = useState<SimState>(alreadySeen ? "finished" : "idle");
  const [currentMinute, setCurrentMinute] = useState(alreadySeen ? 90 : 0);
  const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>(alreadySeen && match ? match.events : []);
  const [speed, setSpeed] = useState<Speed>(2);
  const [liveHomeGoals, setLiveHomeGoals] = useState(alreadySeen && match ? match.homeGoals : 0);
  const [liveAwayGoals, setLiveAwayGoals] = useState(alreadySeen && match ? match.awayGoals : 0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const processedMinutesRef = useRef<Set<number>>(new Set());

  const [celebration, setCelebration] = useState<{
    scorer?: string; team?: string; color?: string; isPlayer: boolean;
  } | null>(null);
  const [audioOn, setAudioOn] = useState(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startLive = useCallback(() => {
    if (!match) return;
    // Remove from seen so replay works properly
    seenMatchIds.delete(getMatchKey(match));
    processedMinutesRef.current = new Set();
    setSimState("running");
    setCurrentMinute(0);
    setVisibleEvents([]);
    setLiveHomeGoals(0);
    setLiveAwayGoals(0);
  }, [match]);

  // Mark match as seen when simulation finishes
  useEffect(() => {
    if (simState === "finished" && match) {
      seenMatchIds.add(getMatchKey(match));
    }
  }, [simState, match]);

  // Hold press conference while replay runs; release when finished or unmount
  useEffect(() => {
    setPressHold(true);
    return () => { releasePress(); };
  }, [setPressHold, releasePress]);

  useEffect(() => {
    if (simState === "finished") releasePress();
  }, [simState, releasePress]);

  // Crowd audio lifecycle
  useEffect(() => {
    if (!audioOn) { stopCrowd(); return; }
    if (simState === "running") {
      startCrowd();
      setIntensity(0.35);
    } else if (simState === "paused") {
      setIntensity(0.1);
    } else if (simState === "finished") {
      setIntensity(0.5);
    }
  }, [simState, audioOn]);

  useEffect(() => () => stopCrowd(), []);

  // Auto-finish match if user navigates away
  useEffect(() => {
    return () => {
      // If we are unmounting and the match is still running/paused, mark it as seen
      // so it doesn't replay from 0 next time they visit
      if (match && (simState === "running" || simState === "paused")) {
        seenMatchIds.add(getMatchKey(match));
      }
    };
  }, [simState, match]);

  useEffect(() => {
    // Auto-start live simulation when component mounts with a NEW match
    if (match && simState === "idle" && !alreadySeen) {
      const id = setTimeout(() => startLive(), 0);
      return () => clearTimeout(id);
    }
  }, [match, simState, startLive, alreadySeen]);

  const togglePause = useCallback(() => {
    setSimState(s => s === "running" ? "paused" : "running");
  }, []);

  const skipToEnd = useCallback(() => {
    if (!match) return;
    clearTimer();
    processedMinutesRef.current = new Set();
    setCurrentMinute(90);
    setVisibleEvents(match.events);
    setLiveHomeGoals(match.homeGoals);
    setLiveAwayGoals(match.awayGoals);
    setSimState("finished");
  }, [match, clearTimer]);

  useEffect(() => {
    if (simState === "running" && match) {
      intervalRef.current = setInterval(() => {
        setCurrentMinute(prev => {
          const nextMinute = prev + 1;
          if (nextMinute >= 90) {
            clearTimer();
            setCurrentMinute(90);
            setVisibleEvents(match.events);
            setLiveHomeGoals(match.homeGoals);
            setLiveAwayGoals(match.awayGoals);
            setSimState("finished");
            return 90;
          }

          // check events for this minute
          if (!processedMinutesRef.current.has(nextMinute)) {
            const minEvents = match.events.filter(e => e.minute === nextMinute);
            if (minEvents.length > 0) {
              setVisibleEvents(curr => [...curr, ...minEvents]);
              
              const newHomeGoals = minEvents.filter(e => e.type === "goal" && e.team === "home").length;
              const newAwayGoals = minEvents.filter(e => e.type === "goal" && e.team === "away").length;

              if (newHomeGoals > 0) setLiveHomeGoals(g => g + newHomeGoals);
              if (newAwayGoals > 0) setLiveAwayGoals(g => g + newAwayGoals);

              // Cinematic: celebration + audio bursts
              const goalEvt = minEvents.find(e => e.type === "goal");
              if (goalEvt) {
                const isPlayerSide =
                  (goalEvt.team === "home" && match.homeClub.id === playerClub.id) ||
                  (goalEvt.team === "away" && match.awayClub.id === playerClub.id);
                const club = goalEvt.team === "home" ? match.homeClub : match.awayClub;
                setCelebration({
                  scorer: goalEvt.playerName,
                  team: club.shortName,
                  color: club.colors?.primary,
                  isPlayer: isPlayerSide,
                });
                goalBurst();
              }
              if (minEvents.some(e => e.type === "halftime" || e.type === "fulltime" || e.type === "kickoff")) {
                whistle();
              }

              if (feedRef.current) {
                setTimeout(() => {
                  if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
                }, 50);
              }
            }
            processedMinutesRef.current.add(nextMinute);
          }
          return nextMinute;
        });
      }, 1000 / speed);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [simState, match, speed, clearTimer, playerClub.id]);

  if (!match) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>⚽ Resultado da Partida</h1>
        <div className="card" style={{ padding: "60px", textAlign: "center" }}>
          <p style={{ fontSize: "48px", marginBottom: "16px" }}>⚽</p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "16px" }}>
            Nenhuma partida jogada ainda. Avance a rodada no Dashboard!
          </p>
        </div>
      </div>
    );
  }

  const isLive = simState === "running" || simState === "paused";
  const isFinished = simState === "finished";
  const showLive = isLive || isFinished;

  const displayHomeGoals = showLive ? liveHomeGoals : match.homeGoals;
  const displayAwayGoals = showLive ? liveAwayGoals : match.awayGoals;

  // Post-match result for player
  const isPlayerHome = match.homeClub.id === playerClub.id;
  const playerGoals = isPlayerHome ? displayHomeGoals : displayAwayGoals;
  const opponentGoals = isPlayerHome ? displayAwayGoals : displayHomeGoals;
  const matchResult = playerGoals > opponentGoals ? "win" : playerGoals < opponentGoals ? "loss" : "draw";

  return (
    <div style={styles.page}>
      {/* Header with controls */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          {isLive ? "🔴 AO VIVO" : isFinished ? "🏁 Resultado Final" : "⚽ Último Jogo"}
        </h1>
        <div style={styles.controls}>
          {simState === "idle" && (
            <button className="btn-primary" onClick={startLive}>
              ▶️ Assistir ao Vivo
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => setAudioOn(v => !v)}
            title={audioOn ? "Desligar som da torcida" : "Ligar som da torcida"}
            style={{ padding: "6px 10px" }}
          >
            {audioOn ? "🔊" : "🔇"}
          </button>
          {isLive && (
            <>
              <button className="btn-secondary" onClick={togglePause}>
                {simState === "paused" ? "▶️ Continuar" : "⏸️ Pausar"}
              </button>
              <button className="btn-secondary" onClick={skipToEnd}>
                ⏩ Pular
              </button>
              <div style={styles.speedControl}>
                {([0.5, 1, 2, 5, 10] as Speed[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    style={{
                      ...styles.speedBtn,
                      ...(speed === s ? styles.speedBtnActive : {}),
                    }}
                  >{s}x</button>
                ))}
              </div>
            </>
          )}
          {isFinished && (
            <>
              <button className="btn-primary" onClick={() => navigate("/game")} style={{ padding: "10px 24px" }}>
                ▶ Continuar
              </button>
              <button className="btn-secondary" onClick={() => { startLive(); }}>
                🔄 Replay
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live minute indicator */}
      {showLive && (
        <div style={styles.minuteBar}>
          <div style={styles.minuteTrack}>
            <div style={{
              ...styles.minuteProgress,
              width: `${(currentMinute / 90) * 100}%`,
            }} />
            {currentMinute === 45 && <div style={{ ...styles.minuteMarker, left: "50%" }} />}
          </div>
          <span style={styles.minuteText}>
            {isLive && simState === "running" && <span style={styles.liveDot} />}
            {currentMinute}'
          </span>
        </div>
      )}

      {/* Scoreboard */}
      <div className="card pitch-bg" style={{ ...styles.scoreboard, position: "relative", overflow: "hidden" }}>
        <div style={styles.team}>
          <div style={{
            ...styles.teamBadge,
            background: "var(--color-bg-secondary)",
            border: `2px solid var(--color-border)`,
            overflow: "hidden",
            position: "relative"
          }}>
            <img 
              src={`/assets/clubs/logos/${match.homeClub.id}.png`}
              alt={match.homeClub.shortName}
              style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px", position: "absolute", inset: 0 }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div style={{
              width: "100%", height: "100%", display: "none", alignItems: "center", justifyContent: "center",
              background: match.homeClub.colors?.primary || "#333",
              border: `2px solid ${match.homeClub.colors?.secondary || "#fff"}`,
              borderRadius: "50%",
              boxSizing: "border-box"
            }}>
              <span style={{ fontWeight: 900, color: "#fff", fontSize: "14px" }}>{match.homeClub.shortName}</span>
            </div>
          </div>
          <span style={styles.teamName}>{match.homeClub.name}</span>
        </div>
        <div style={styles.scoreCenter}>
          <span style={{
            ...styles.score,
            ...(showLive && liveHomeGoals !== displayHomeGoals ? styles.scoreFlash : {}),
          }}>{displayHomeGoals}</span>
          <span style={styles.scoreX}>×</span>
          <span style={{
            ...styles.score,
            ...(showLive && liveAwayGoals !== displayAwayGoals ? styles.scoreFlash : {}),
          }}>{displayAwayGoals}</span>
        </div>
        <div style={styles.team}>
          <div style={{
            ...styles.teamBadge,
            background: "var(--color-bg-secondary)",
            border: `2px solid var(--color-border)`,
            overflow: "hidden",
            position: "relative"
          }}>
            <img 
              src={`/assets/clubs/logos/${match.awayClub.id}.png`}
              alt={match.awayClub.shortName}
              style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px", position: "absolute", inset: 0 }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div style={{
              width: "100%", height: "100%", display: "none", alignItems: "center", justifyContent: "center",
              background: match.awayClub.colors?.primary || "#333",
              border: `2px solid ${match.awayClub.colors?.secondary || "#fff"}`,
              borderRadius: "50%",
              boxSizing: "border-box"
            }}>
              <span style={{ fontWeight: 900, color: "#fff", fontSize: "14px" }}>{match.awayClub.shortName}</span>
            </div>
          </div>
          <span style={styles.teamName}>{match.awayClub.name}</span>
        </div>
      </div>

      {/* Post-match result banner */}
      {isFinished && (
        <div style={{
          ...styles.resultBanner,
          background: matchResult === "win"
            ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))"
            : matchResult === "loss"
            ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))"
            : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
          borderColor: matchResult === "win" ? "rgba(16,185,129,0.3)"
            : matchResult === "loss" ? "rgba(239,68,68,0.3)"
            : "rgba(245,158,11,0.3)",
          animation: "fadeSlideIn 0.5s ease",
        }}>
          <span style={{ fontSize: "32px" }}>
            {matchResult === "win" ? "🏆" : matchResult === "loss" ? "😞" : "🤝"}
          </span>
          <div>
            <div style={{
              fontSize: "18px", fontWeight: 900,
              color: matchResult === "win" ? "#10b981" : matchResult === "loss" ? "#ef4444" : "#f59e0b",
            }}>
              {matchResult === "win" ? "VITÓRIA!" : matchResult === "loss" ? "DERROTA" : "EMPATE"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              {playerClub.name} {playerGoals} × {opponentGoals} {isPlayerHome ? match.awayClub.name : match.homeClub.name}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate("/game")}
            style={{
              marginLeft: "auto", padding: "12px 32px", fontSize: "14px", fontWeight: 800,
              background: matchResult === "win" ? "#10b981" : matchResult === "loss" ? "#ef4444" : "#f59e0b",
            }}
          >
            ▶ Próxima Rodada
          </button>
        </div>
      )}

      <div style={styles.mainContent}>
        {/* Live narration feed */}
        {showLive && (
          <div className="card" style={styles.feedCard}>
            <h3 style={styles.sectionTitle}>🎙️ Narração</h3>
            <div ref={feedRef} style={styles.feed}>
              {visibleEvents.length === 0 && simState === "running" && (
                <div style={styles.waitingMsg}>
                  <span style={styles.loadingDots}>Aguardando primeiro lance...</span>
                </div>
              )}
              {visibleEvents.map((evt, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.feedItem,
                    background: getEventGlow(evt.type),
                    borderLeft: evt.importance === "high" ? "3px solid #10b981"
                      : evt.importance === "medium" ? "3px solid #f59e0b"
                      : "3px solid transparent",
                    animation: i === visibleEvents.length - 1 ? "fadeSlideIn 0.3s ease" : "none",
                  }}
                >
                  <div style={styles.feedItemHeader}>
                    <span style={styles.feedMinute}>{evt.minute}'</span>
                    <span style={styles.feedIcon}>{getEventIcon(evt.type)}</span>
                    {evt.team !== "neutral" && (
                      <span style={{
                        ...styles.feedTeamBadge,
                        background: evt.team === "home"
                          ? match.homeClub.colors?.primary : match.awayClub.colors?.primary,
                      }}>
                        {evt.team === "home" ? match.homeClub.shortName : match.awayClub.shortName}
                      </span>
                    )}
                  </div>
                  <p style={{
                    ...styles.feedCommentary,
                    fontWeight: evt.importance === "high" ? 700 : 400,
                    fontSize: evt.importance === "high" ? "14px" : "13px",
                  }}>{evt.commentary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats panel */}
        <div className="card" style={styles.statsCard}>
          <h3 style={styles.sectionTitle}>📊 Estatísticas</h3>
          <div style={styles.statsGrid}>
            <StatBar label="Posse %" home={match.possession.home} away={match.possession.away} />
            <StatBar label="Finalizações" home={match.shots.home} away={match.shots.away} />
            <StatBar label="No Gol" home={match.shotsOnTarget.home} away={match.shotsOnTarget.away} />
            <StatBar label="Faltas" home={match.fouls.home} away={match.fouls.away} />
            <StatBar label="Escanteios" home={match.corners.home} away={match.corners.away} />
            <StatBar label="Rating" home={match.homeRating} away={match.awayRating} />
          </div>

          {/* Goal scorers summary */}
          {(isFinished || !showLive) && match.events.filter(e => e.type === "goal").length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "10px" }}>⚽ Gols</h4>
              {match.events.filter(e => e.type === "goal").map((g, i) => (
                <div key={i} style={styles.goalLine}>
                  <span style={{ fontSize: "11px", color: "var(--color-accent-primary)", fontWeight: 700 }}>{g.minute}'</span>
                  <span style={{
                    fontSize: "8px", padding: "2px 6px", borderRadius: "3px", fontWeight: 800, color: "#fff",
                    background: g.team === "home" ? match.homeClub.colors?.primary : match.awayClub.colors?.primary,
                  }}>{g.team === "home" ? match.homeClub.shortName : match.awayClub.shortName}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{g.playerName}</span>
                  {g.assistName && <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>({g.assistName})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Man of the Match */}
          {(isFinished || !showLive) && match.motm && (
            <div style={{
              marginTop: "16px", padding: "12px 16px", borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(16,185,129,0.08))",
              border: "1px solid rgba(245,158,11,0.25)",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <span style={{ fontSize: "24px" }}>🏆</span>
              <div>
                <div style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Craque do Jogo
                </div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-text-primary)" }}>
                  {match.motm.name}
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-muted)", marginLeft: "8px" }}>
                    ({match.motm.team === "home" ? match.homeClub.shortName : match.awayClub.shortName})
                  </span>
                </div>
              </div>
              <span style={{
                marginLeft: "auto", fontSize: "18px", fontWeight: 900,
                color: match.motm.rating >= 8 ? "#10b981" : match.motm.rating >= 7 ? "#f59e0b" : "var(--color-text-secondary)",
              }}>
                {match.motm.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Match History */}
      {matchHistory.length > 1 && (
        <div className="card" style={{ padding: "20px", marginTop: "16px" }}>
          <h3 style={styles.sectionTitle}>📜 Histórico</h3>
          <div style={styles.history}>
            {matchHistory.slice(-8).reverse().map((m, i) => {
              const isHome = m.homeClub.id === playerClub.id;
              const myGoals = isHome ? m.homeGoals : m.awayGoals;
              const theirGoals = isHome ? m.awayGoals : m.homeGoals;
              const opponent = isHome ? m.awayClub.shortName : m.homeClub.shortName;
              const resultLabel = myGoals > theirGoals ? "V" : myGoals < theirGoals ? "D" : "E";
              const color = resultLabel === "V" ? "#10b981" : resultLabel === "D" ? "#ef4444" : "#f59e0b";

              return (
                <div key={i} style={styles.historyItem}>
                  <span style={{ ...styles.resultBadge, background: color }}>{resultLabel}</span>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    {isHome ? "🏠" : "✈️"} vs {opponent}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "13px" }}>{myGoals}—{theirGoals}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cinematic goal celebration overlay */}
      <GoalCelebration
        show={!!celebration}
        scorerName={celebration?.scorer}
        teamName={celebration?.team}
        teamColor={celebration?.color}
        isPlayerGoal={celebration?.isPlayer ?? false}
        onDone={() => setCelebration(null)}
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes scoreFlash {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); color: #10b981; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  const homePercent = (home / total) * 100;

  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontWeight: 700, fontSize: "13px" }}>{home}</span>
        <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: "13px" }}>{away}</span>
      </div>
      <div style={{
        height: "6px", borderRadius: "3px",
        background: "var(--color-bg-tertiary)", display: "flex", overflow: "hidden",
      }}>
        <div style={{
          width: `${homePercent}%`, background: "var(--color-accent-primary)",
          borderRadius: "3px 0 0 3px", transition: "width 0.3s ease",
        }} />
        <div style={{
          flex: 1, background: "var(--color-text-muted)", opacity: 0.3,
          borderRadius: "0 3px 3px 0",
        }} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflow: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  title: { fontSize: "24px", fontWeight: 800 },
  controls: { display: "flex", alignItems: "center", gap: "8px" },

  speedControl: { display: "flex", gap: "2px", marginLeft: "8px" },
  speedBtn: {
    padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)",
  },
  speedBtnActive: {
    background: "var(--color-accent-primary)", borderColor: "var(--color-accent-primary)", color: "#fff",
  },

  minuteBar: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  minuteTrack: {
    flex: 1, height: "4px", borderRadius: "2px",
    background: "var(--color-bg-tertiary)", position: "relative" as const, overflow: "hidden",
  },
  minuteProgress: {
    height: "100%", background: "linear-gradient(90deg, #10b981, #f59e0b)",
    borderRadius: "2px", transition: "width 0.15s linear",
  },
  minuteMarker: { position: "absolute" as const, top: "-2px", width: "2px", height: "8px", background: "#fff" },
  minuteText: {
    fontSize: "16px", fontWeight: 900, color: "var(--color-accent-primary)",
    display: "flex", alignItems: "center", gap: "6px", minWidth: "50px",
  },
  liveDot: {
    width: "8px", height: "8px", borderRadius: "50%",
    background: "#ef4444", display: "inline-block",
    animation: "pulse 1s infinite",
  },

  scoreboard: {
    padding: "28px 24px", display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: "16px",
  },
  team: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: 1 },
  teamBadge: {
    width: "52px", height: "52px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  teamName: { fontSize: "14px", fontWeight: 600, textAlign: "center" },
  scoreCenter: { display: "flex", alignItems: "center", gap: "16px" },
  score: { fontSize: "52px", fontWeight: 900, color: "var(--color-accent-primary)", transition: "all 0.3s" },
  scoreFlash: { animation: "scoreFlash 0.5s ease" },
  scoreX: { fontSize: "24px", color: "var(--color-text-muted)" },

  resultBanner: {
    display: "flex", alignItems: "center", gap: "16px",
    padding: "20px 24px", borderRadius: "12px",
    border: "1px solid", marginBottom: "16px",
  },

  mainContent: { display: "flex", gap: "16px", marginBottom: "16px" },

  feedCard: { flex: 1, padding: "20px", display: "flex", flexDirection: "column", maxHeight: "420px" },
  feed: { flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" },
  feedItem: {
    padding: "10px 12px", borderRadius: "8px", transition: "all 0.2s",
  },
  feedItemHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" },
  feedMinute: {
    fontSize: "11px", fontWeight: 800, color: "var(--color-accent-primary)",
    background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: "4px",
  },
  feedIcon: { fontSize: "14px" },
  feedTeamBadge: {
    fontSize: "9px", fontWeight: 800, color: "#fff",
    padding: "2px 6px", borderRadius: "3px",
  },
  feedCommentary: {
    fontSize: "13px", color: "var(--color-text-primary)", lineHeight: 1.5, margin: 0,
  },
  waitingMsg: { padding: "20px", textAlign: "center" },
  loadingDots: { fontSize: "13px", color: "var(--color-text-muted)", animation: "pulse 1.5s infinite" },

  statsCard: { width: "320px", flexShrink: 0, padding: "20px" },
  sectionTitle: { fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--color-text-secondary)" },
  statsGrid: { maxWidth: "100%" },

  goalLine: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" },

  history: { display: "flex", flexDirection: "column", gap: "8px" },
  historyItem: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" },
  resultBadge: {
    width: "24px", height: "24px", borderRadius: "4px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: "12px", color: "#fff",
  },
};
