import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { useTranslation } from "../context/I18nContext";
import { formatCurrency } from "../engine/financeEngine";
import SeasonEndModal from "./SeasonEndModal";
import MetaHUD from "./MetaHUD";
import MetaBridge from "./MetaBridge";
import AchievementToast from "./AchievementToast";
import { useMeta } from "../context/MetaContext";
import { useBoard } from "../context/BoardContext";
import BoardBridge from "./BoardBridge";
import PressConferenceModal from "./PressConferenceModal";
import { findRivalry } from "../data/rivalries";
import BattlePassBridge from "./BattlePassBridge";
import BattlePassRewardToast from "./BattlePassRewardToast";
import { useBattlePass } from "../context/BattlePassContext";
import { BATTLE_PASS_TIERS } from "../data/battlepassTiers";
import HallOfFameBridge from "./HallOfFameBridge";
import BrokenRecordToast from "./BrokenRecordToast";

const NAV_ITEMS = [
  { path: "/game", labelKey: "nav.dashboard", icon: "📊", end: true },
  { path: "/game/inbox", labelKey: "nav.inbox", icon: "📧", fallbackLabel: "Caixa de Entrada" },
  { path: "/game/club", labelKey: "nav.club", icon: "🏟️" },
  { path: "/game/squad", labelKey: "nav.squad", icon: "👥" },
  { path: "/game/tactics", labelKey: "nav.tactics", icon: "📋" },
  { path: "/game/training", labelKey: "nav.training", icon: "🏋️" },
  { path: "/game/youth", labelKey: "nav.youth", icon: "🌱", fallbackLabel: "Categorias de Base" },
  { path: "/game/league", labelKey: "nav.league", icon: "🏆" },
  { path: "/game/transfers", labelKey: "nav.transfers", icon: "🔄" },
  { path: "/game/scouting", labelKey: "nav.scouting", icon: "🔍" },
  { path: "/game/packs", labelKey: "nav.packs", icon: "🃏" },
  { path: "/game/finances", labelKey: "nav.finances", icon: "💰" },
  { path: "/game/match", labelKey: "nav.match", icon: "⚽" },
  { path: "/game/challenges", labelKey: "nav.challenges", icon: "🎯", fallbackLabel: "Desafios" },
  { path: "/game/achievements", labelKey: "nav.achievements", icon: "🏆", fallbackLabel: "Conquistas" },
  { path: "/game/news", labelKey: "nav.news", icon: "📰", fallbackLabel: "Manchetes" },
  { path: "/game/board", labelKey: "nav.board", icon: "👔", fallbackLabel: "Diretoria" },
  { path: "/game/battlepass", labelKey: "nav.battlepass", icon: "🎟️", fallbackLabel: "Battle Pass" },
  { path: "/game/hall-of-fame", labelKey: "nav.hof", icon: "🏛️", fallbackLabel: "Hall of Fame" },
] as Array<{ path: string; labelKey: string; icon: string; end?: boolean; fallbackLabel?: string }>;

export default function GameLayout() {
  const {
    playerClub, currentDate, currentRound, season, standings, budget,
    saveGame, loadGame, deleteSave, getSaveSlots, lastSaveTime,
    seasonEndResult, startNewSeason, allClubs, fixtures,
    inbox = [],
  } = useGame();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof getSaveSlots>>>([]);

  const loadSlots = useCallback(async () => {
    try {
      const s = await getSaveSlots();
      setSlots(s);
    } catch (e) {
      console.error(e);
    }
  }, [getSaveSlots]);

  useEffect(() => {
    if (!showSaveModal) return;
    const id = requestAnimationFrame(() => loadSlots());
    return () => cancelAnimationFrame(id);
  }, [showSaveModal, loadSlots]);

  const handleNavClick = useCallback((_e: React.MouseEvent, _path: string) => { void _e; void _path; }, []);

  const myStanding = standings.find(s => s.clubId === playerClub.id);
  const myPosition = standings.findIndex(s => s.clubId === playerClub.id) + 1;
  const totalRounds = (allClubs.length - 1) * 2;
  const seasonProgress = totalRounds > 0 ? Math.round((currentRound / totalRounds) * 100) : 0;

  const formattedDate = new Date(currentDate).toLocaleDateString(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Form — last 5 results
  const formResults: Array<"W" | "D" | "L"> = [];
  if (myStanding) {
    const played = myStanding.played;
    if (played > 0) {
      // Infer from standings — simplified
      for (let i = 0; i < Math.min(5, played); i++) {
        if (i < myStanding.won) formResults.push("W");
        else if (i < myStanding.won + myStanding.drawn) formResults.push("D");
        else formResults.push("L");
      }
      // Deterministic pseudo-shuffle based on current date for visual variety
      const seed = currentDate.split("-").reduce((s, n) => s + parseInt(n), 0);
      formResults.sort((a, b) => {
        const hash = (seed + (a === "W" ? 7 : a === "D" ? 3 : 1) * (b === "W" ? 13 : b === "D" ? 5 : 11)) % 3;
        return hash - 1;
      });
    }
  }

  // Next match
  const nextFixture = fixtures.find(f => f.round === currentRound + 1 && (f.homeClubId === playerClub.id || f.awayClubId === playerClub.id));
  const isHome = nextFixture?.homeClubId === playerClub.id;
  const opponentId = isHome ? nextFixture?.awayClubId : nextFixture?.homeClubId;
  const opponentClub = allClubs.find(c => c.id === opponentId);

  const exportSave = (slot: number) => {
    const data = localStorage.getItem(`footsim_save_${slot}`);
    if (!data) return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `footsim_save_slot_${slot}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSave = (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        if (parsed.version && parsed.playerClubId) {
          localStorage.setItem(`footsim_save_${slot}`, json);
          setSaveMsg(`✅ ${t("game.importSuccess")}`);
          setTimeout(() => setSaveMsg(null), 2000);
        } else {
          throw new Error("Invalid format");
        }
      } catch {
        setSaveMsg(`❌ ${t("game.importError")}`);
        setTimeout(() => setSaveMsg(null), 2000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const posColor = myPosition <= 4 ? "#10b981" : myPosition >= 8 ? "#ef4444" : "#f59e0b";

  const meta = useMeta();
  const board = useBoard();
  const bp = useBattlePass();
  const boardAlert = board.confidence.label === "critical" || board.confidence.label === "sacking" ? 1 : 0;
  const bpClaimable = BATTLE_PASS_TIERS.filter(t => t.tier <= bp.currentTier && !bp.state.claimedTiers.includes(t.tier)).length;
  const navBadges: Record<string, number> = {
    "/game/news": meta.unreadNewsCount,
    "/game/challenges": meta.challenges.filter(c => !c.done).length,
    "/game/board": boardAlert,
    "/game/battlepass": bpClaimable,
    "/game/inbox": inbox.filter(m => !m.read).length,
  };

  // Mark derby on next match
  const nextDerby = opponentClub ? findRivalry(playerClub.id, opponentClub.id) : undefined;

  return (
    <div style={styles.layout}>
      <MetaBridge />
      <BoardBridge />
      <BattlePassBridge />
      <HallOfFameBridge />
      <PressConferenceModal />
      <AchievementToast />
      <BattlePassRewardToast />
      <BrokenRecordToast />
      {/* Season End Modal */}
      {seasonEndResult && (
        <SeasonEndModal
          result={seasonEndResult}
          season={season}
          onContinue={() => {
            startNewSeason();
            navigate("/game");
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Club Badge Section */}
        <div style={styles.clubSection}>
          <div style={styles.badgeContainer}>
            <img 
              src={`/assets/clubs/logos/${playerClub.id}.png`} 
              alt={playerClub.shortName}
              style={styles.clubLogo}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div style={{
              ...styles.badgeCircleFallback,
              background: `linear-gradient(135deg, ${playerClub.colors?.primary || "#1a1a1a"} 0%, ${playerClub.colors?.secondary || "#333"} 100%)`,
              display: 'none' // Hidden by default, shown on error
            }}>
              <span style={styles.badgeText}>{playerClub.shortName}</span>
            </div>
          </div>
          <div style={styles.clubInfo}>
            <h2 style={styles.clubTitle}>{playerClub.name}</h2>
            <span style={styles.clubLeague}>{playerClub.league}</span>
          </div>
        </div>

        <MetaHUD />

        {/* Season Strip */}
        <div style={styles.seasonStrip}>
          <div style={styles.stripRow}>
            <span style={styles.stripLabel}>📅 {formattedDate}</span>
            <span style={styles.stripValue}>T{season}</span>
          </div>
          <div style={styles.stripRow}>
            <span style={styles.stripLabel}>Rodada {currentRound}/{totalRounds}</span>
            <span style={{ ...styles.stripValue, color: posColor, fontWeight: 900 }}>
              {myPosition > 0 ? `${myPosition}º` : "—"}
            </span>
          </div>
          {/* Season progress bar */}
          <div className="season-progress" style={{ marginTop: "6px" }}>
            <div className="season-progress-fill" style={{ width: `${seasonProgress}%` }} />
          </div>
        </div>

        {/* Quick Stats */}
        <div style={styles.quickStats}>
          <div style={styles.qStat}>
            <span style={styles.qStatValue}>{myStanding?.points ?? 0}</span>
            <span style={styles.qStatLabel}>PTS</span>
          </div>
          <div style={styles.qStat}>
            <span style={{ ...styles.qStatValue, color: "#10b981" }}>{myStanding?.won ?? 0}</span>
            <span style={styles.qStatLabel}>V</span>
          </div>
          <div style={styles.qStat}>
            <span style={{ ...styles.qStatValue, color: "#f59e0b" }}>{myStanding?.drawn ?? 0}</span>
            <span style={styles.qStatLabel}>E</span>
          </div>
          <div style={styles.qStat}>
            <span style={{ ...styles.qStatValue, color: "#ef4444" }}>{myStanding?.lost ?? 0}</span>
            <span style={styles.qStatLabel}>D</span>
          </div>
        </div>

        {/* Form Indicator */}
        {formResults.length > 0 && (
          <div style={styles.formSection}>
            <span style={styles.formTitle}>Forma Recente</span>
            <div style={styles.formDots}>
              {formResults.map((r, i) => (
                <span key={i} className={`form-dot form-dot-${r.toLowerCase()}`}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next Match Preview */}
        {opponentClub && (
          <div style={{
            ...styles.nextMatch,
            ...(nextDerby ? {
              background: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(245,158,11,0.10))",
              borderBottom: "1px solid rgba(239,68,68,0.35)",
            } : {}),
          }}>
            <span style={{ ...styles.nextMatchLabel, ...(nextDerby ? { color: "#ef4444" } : {}) }}>
              {nextDerby ? `🔥 ${nextDerby.name.toUpperCase()}` : "Próximo Jogo"}
            </span>
            <div style={styles.nextMatchTeams}>
              <span style={{ fontWeight: 700, fontSize: "12px" }}>
                {isHome ? playerClub.shortName : opponentClub.shortName}
              </span>
              <span style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 800 }}>vs</span>
              <span style={{ fontWeight: 700, fontSize: "12px" }}>
                {isHome ? opponentClub.shortName : playerClub.shortName}
              </span>
            </div>
            <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
              {isHome ? "🏠 Casa" : "✈️ Fora"} • Rodada {currentRound + 1}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const badge = navBadges[item.path];
            const tr = t(item.labelKey);
            const label = tr && tr !== item.labelKey ? tr : (item.fallbackLabel ?? tr);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={(e) => handleNavClick(e, item.path)}
                style={({ isActive }) => ({
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                })}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {!!badge && badge > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 900,
                    background: "#ef4444", color: "#fff",
                    padding: "1px 6px", borderRadius: 10, minWidth: 16, textAlign: "center",
                    boxShadow: "0 0 8px rgba(239,68,68,0.6)",
                  }}>{badge > 99 ? "99+" : badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Controls */}
        <div style={styles.bottomControls}>
          <button onClick={() => setShowSaveModal(true)} style={styles.saveBtn}>
            💾 {t("game.saveLoad")}
          </button>
          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
            <button
              style={{ ...styles.langBtn, opacity: language === "pt-BR" ? 1 : 0.4 }}
              onClick={() => setLanguage("pt-BR")}
            >🇧🇷</button>
            <button
              style={{ ...styles.langBtn, opacity: language === "en-US" ? 1 : 0.4 }}
              onClick={() => setLanguage("en-US")}
            >🇺🇸</button>
          </div>
          {lastSaveTime && (
            <div style={{ fontSize: "9px", color: "var(--color-text-muted)", textAlign: "center" }}>
              Auto: {new Date(lastSaveTime).toLocaleTimeString(language)}
            </div>
          )}
          {/* Budget mini */}
          <div style={styles.budgetMini}>
            <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Saldo</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: budget >= 0 ? "#10b981" : "#ef4444" }}>
              {formatCurrency(budget)}
            </span>
          </div>
        </div>

        <div style={styles.sideFooter}>
          <span style={{ fontSize: "9px", color: "var(--color-text-muted)", letterSpacing: "1px" }}>FOOTSIM v0.3.0</span>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <Outlet />
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <div style={styles.modalOverlay} onClick={() => { setShowSaveModal(false); setSaveMsg(null); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "20px" }}>💾 {t("game.saveLoad")}</h2>

            {saveMsg && (
              <div className="animate-fade-in" style={{
                padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
                background: saveMsg.includes("✅") ? "rgba(16, 185, 129, 0.12)" : saveMsg.includes("🗑️") ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)",
                color: saveMsg.includes("✅") ? "#10b981" : saveMsg.includes("🗑️") ? "#f59e0b" : "#ef4444",
                border: `1px solid ${saveMsg.includes("✅") ? "rgba(16, 185, 129, 0.25)" : saveMsg.includes("🗑️") ? "rgba(245, 158, 11, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                fontSize: "13px", fontWeight: 700,
              }}>
                {saveMsg}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {slots.map((slot, i) => (
                <div key={i} style={styles.slotRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-accent-primary)", textTransform: "uppercase", letterSpacing: "1px" }}>Slot {i + 1}</div>
                    {slot ? (
                      <>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>{slot.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          {slot.clubName} • T{slot.season} • R{slot.round} • {slot.position}º
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                          {new Date(slot.timestamp).toLocaleString(language)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic" }}>{t("menu.emptySlot")}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "160px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: slot ? "1fr 1fr" : "1fr", gap: "6px" }}>
                      <button className="btn-primary" style={{ padding: "7px", fontSize: "11px", width: "100%" }}
                        onClick={async () => {
                          const ok = await saveGame(i + 1, `Save ${i + 1}`);
                          setSaveMsg(ok ? `✅ ${t("game.saveSuccess")}` : `❌ ${t("game.saveError")}`);
                          loadSlots();
                          setTimeout(() => setSaveMsg(null), 2500);
                        }}
                      >{t("menu.save") || "Salvar"}</button>
                      {slot && (
                        <button className="btn-secondary" style={{ padding: "7px", fontSize: "11px", width: "100%" }}
                          onClick={async () => {
                            const ok = await loadGame(slot.slot);
                            if (ok) {
                              setShowSaveModal(false);
                              setSaveMsg(null);
                            }
                          }}
                        >{t("menu.load")}</button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: slot ? "1fr 1fr 1fr" : "1fr", gap: "4px" }}>
                      <label className="btn-secondary" style={{ padding: "5px", fontSize: "11px", cursor: "pointer", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center" }} title={t("menu.import")}>
                        📥
                        <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => importSave(e, i + 1)} />
                      </label>
                      {slot && (
                        <>
                          <button className="btn-secondary" style={{ padding: "5px", fontSize: "11px", display: "flex", justifyContent: "center", alignItems: "center" }} title={t("menu.export")} onClick={() => exportSave(i + 1)}>📤</button>
                          <button
                            style={{ padding: "5px", fontSize: "11px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.15)", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s ease" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
                            title={t("menu.delete")}
                            onClick={async () => {
                              await deleteSave(slot.slot);
                              setSaveMsg(`🗑️ ${t("game.slotDeleted")}`);
                              loadSlots();
                              setTimeout(() => setSaveMsg(null), 2500);
                            }}
                          >🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-secondary" style={{ marginTop: "14px", width: "100%" }}
              onClick={() => { setShowSaveModal(false); setSaveMsg(null); }}
            >{t("menu.close")}</button>
          </div>
        </div>
      )}

      {/* Nav Guard Modal */}
      {pendingNav && (
        <div style={styles.modalOverlay} onClick={() => setPendingNav(null)}>
          <div style={{ ...styles.modal, width: "380px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: "36px", marginBottom: "12px" }}>⚽</p>
            <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Partida em Andamento</h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Tem certeza que deseja sair? Você pode voltar à partida depois pelo menu.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-primary" style={{ flex: 1, padding: "12px" }} onClick={() => setPendingNav(null)}>Ficar no Jogo</button>
              <button className="btn-secondary" style={{ flex: 1, padding: "12px" }}
                onClick={() => { const dest = pendingNav; setPendingNav(null); navigate(dest); }}
              >Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100%",
    overflow: "hidden",
  },
  sidebar: {
    width: "240px",
    flexShrink: 0,
    background: "var(--color-bg-secondary)",
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  clubSection: {
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom: "1px solid var(--color-border)",
  },
  badgeContainer: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  clubLogo: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
  },
  badgeCircleFallback: {
    width: "100%",
    height: "100%",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  badgeText: {
    fontSize: "12px",
    fontWeight: 900,
    color: "#fff",
    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
  },
  clubInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflow: "hidden",
  },
  clubTitle: {
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  clubLeague: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  seasonStrip: {
    padding: "10px 16px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  stripRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stripLabel: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
  },
  stripValue: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--color-text-primary)",
  },
  quickStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "2px",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
  },
  qStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1px",
  },
  qStatValue: {
    fontSize: "15px",
    fontWeight: 900,
    color: "var(--color-text-primary)",
    lineHeight: 1,
  },
  qStatLabel: {
    fontSize: "9px",
    color: "var(--color-text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  formSection: {
    padding: "8px 16px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formTitle: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  formDots: {
    display: "flex",
    gap: "4px",
  },
  nextMatch: {
    padding: "10px 16px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    background: "rgba(16, 185, 129, 0.04)",
  },
  nextMatchLabel: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--color-accent-primary)",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  nextMatchTeams: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  nav: {
    flex: 1,
    padding: "6px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    overflowY: "auto",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-secondary)",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: 500,
    transition: "all 0.15s ease",
  },
  navItemActive: {
    background: "rgba(16, 185, 129, 0.12)",
    color: "#10b981",
    fontWeight: 700,
    borderLeft: "3px solid #10b981",
  },
  navIcon: {
    fontSize: "14px",
    width: "20px",
    textAlign: "center",
  },
  bottomControls: {
    padding: "8px 12px",
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  budgetMini: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    background: "var(--color-bg-card)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
  },
  sideFooter: {
    padding: "8px 16px",
    borderTop: "1px solid var(--color-border)",
    textAlign: "center",
  },
  main: {
    flex: 1,
    overflow: "auto",
    background: "var(--color-bg-primary)",
  },
  saveBtn: {
    width: "100%",
    padding: "8px",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-secondary)",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "var(--font-sans)",
  },
  langBtn: {
    background: "none",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    padding: "2px",
    transition: "opacity 0.2s ease",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "14px",
    padding: "24px",
    width: "500px",
    maxWidth: "90vw",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
  },
  slotRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px",
    background: "var(--color-bg-secondary)",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    gap: "10px",
  },
};
