import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useGame } from "../context/GameContext";
import { useTranslation } from "../context/I18nContext";
import SeasonEndModal from "./SeasonEndModal";

const NAV_ITEMS = [
  { path: "/game", labelKey: "nav.dashboard", icon: "🏠", end: true },
  { path: "/game/club", labelKey: "nav.club", icon: "🏢" },
  { path: "/game/squad", labelKey: "nav.squad", icon: "👥" },
  { path: "/game/tactics", labelKey: "nav.tactics", icon: "📋" },
  { path: "/game/training", labelKey: "nav.training", icon: "🏋️" },
  { path: "/game/league", labelKey: "nav.league", icon: "🏆" },
  { path: "/game/transfers", labelKey: "nav.transfers", icon: "🔄" },
  { path: "/game/scouting", labelKey: "nav.scouting", icon: "🕵️" },
  { path: "/game/finances", labelKey: "nav.finances", icon: "💰" },
  { path: "/game/match", labelKey: "nav.match", icon: "⚽" },
];

export default function GameLayout() {
  const {
    playerClub, currentDate, currentRound, season, standings,
    saveGame, loadGame, deleteSave, getSaveSlots, lastSaveTime,
    seasonEndResult, startNewSeason,
  } = useGame();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const myStanding = standings.find(s => s.clubId === playerClub.id);
  const myPosition = standings.findIndex(s => s.clubId === playerClub.id) + 1;

  const formattedDate = new Date(currentDate).toLocaleDateString(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
      } catch (err) {
        setSaveMsg(`❌ ${t("game.importError")}`);
        setTimeout(() => setSaveMsg(null), 2000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={styles.layout}>
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
        {/* Club badge area */}
        <div style={styles.clubBadge}>
          <div style={{
            ...styles.badgeCircle,
            background: playerClub.colors?.primary || "#1a1a1a",
            border: `3px solid ${playerClub.colors?.secondary || "#fff"}`,
          }}>
            <span style={styles.badgeText}>{playerClub.shortName}</span>
          </div>
          <h2 style={styles.clubTitle}>{playerClub.name}</h2>
          <span style={styles.clubLeague}>{playerClub.league}</span>
        </div>

        {/* Season info */}
        <div style={styles.seasonInfo}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Data</span>
            <span style={styles.infoValue}>{formattedDate}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Temporada</span>
            <span style={styles.infoValue}>{season}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Rodada</span>
            <span style={styles.infoValue}>{currentRound}</span>
          </div>
          {myStanding && (
            <>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Posição</span>
                <span style={{ ...styles.infoValue, color: myPosition <= 4 ? "#10b981" : myPosition >= 8 ? "#ef4444" : "#f59e0b" }}>
                  {myPosition}º
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Pontos</span>
                <span style={styles.infoValue}>{myStanding.points}</span>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Save/Load */}
        <div style={{ padding: "0 12px", marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          <button
            onClick={() => setShowSaveModal(true)}
            style={styles.saveBtn}
          >
            💾 {t("game.saveLoad")}
          </button>
          <div style={{display: "flex", gap: "4px", justifyContent: "center"}}>
            <button 
              style={{...styles.langBtn, opacity: language === "pt-BR" ? 1 : 0.5}} 
              onClick={() => setLanguage("pt-BR")}
            >🇧🇷</button>
            <button 
              style={{...styles.langBtn, opacity: language === "en-US" ? 1 : 0.5}} 
              onClick={() => setLanguage("en-US")}
            >🇺🇸</button>
          </div>
          {lastSaveTime && (
            <div style={{ fontSize: "9px", color: "var(--color-text-muted)", textAlign: "center" }}>
              Auto: {new Date(lastSaveTime).toLocaleTimeString(language)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.sideFooter}>
          <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>FootSim v0.3.0</span>
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
            <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "20px" }}>💾 {t("game.saveLoad")}</h2>

            {saveMsg && (
              <div className="animate-fade-in" style={{
                padding: "12px 16px", borderRadius: "10px", marginBottom: "20px",
                background: saveMsg.includes("✅") ? "rgba(16, 185, 129, 0.15)" : saveMsg.includes("🗑️") ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: saveMsg.includes("✅") ? "var(--color-accent-primary)" : saveMsg.includes("🗑️") ? "#f59e0b" : "#ef4444",
                border: `1px solid ${saveMsg.includes("✅") ? "rgba(16, 185, 129, 0.3)" : saveMsg.includes("🗑️") ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                fontSize: "14px", fontWeight: 700,
                display: "flex", alignItems: "center", gap: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}>
                {saveMsg}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {getSaveSlots().map((slot, i) => (
                <div key={i} style={styles.slotRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-accent-primary)", textTransform: "uppercase" }}>Slot {i + 1}</div>
                    {slot ? (
                      <>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>{slot.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          {slot.clubName} • T{slot.season} • R{slot.round} • {slot.position}º
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                          {new Date(slot.timestamp).toLocaleString(language)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: "13px", color: "var(--color-text-muted)", fontStyle: "italic" }}>{t("menu.emptySlot")}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "180px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: slot ? "1fr 1fr" : "1fr", gap: "8px" }}>
                      <button
                        className="btn-primary"
                        style={{ padding: "8px", fontSize: "12px", width: "100%" }}
                        onClick={() => {
                          const ok = saveGame(i + 1, `Save ${i + 1}`);
                          setSaveMsg(ok ? `✅ ${t("game.saveSuccess")}` : `❌ ${t("game.saveError")}`);
                          setTimeout(() => setSaveMsg(null), 2500);
                        }}
                      >{t("menu.save") || "Salvar"}</button>
                      
                      {slot && (
                        <button
                          className="btn-secondary"
                          style={{ padding: "8px", fontSize: "12px", width: "100%" }}
                          onClick={() => {
                            if (loadGame(slot.slot)) {
                              setShowSaveModal(false);
                              setSaveMsg(null);
                            }
                          }}
                        >{t("menu.load")}</button>
                      )}
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: slot ? "1fr 1fr 1fr" : "1fr", gap: "6px" }}>
                      <label 
                        className="btn-secondary" 
                        style={{ padding: "6px", fontSize: "12px", cursor: "pointer", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center" }}
                        title={t("menu.import")}
                      >
                        📥
                        <input type="file" accept=".json" style={{display:"none"}} onChange={(e) => importSave(e, i+1)} />
                      </label>
                      
                      {slot && (
                        <>
                          <button
                            className="btn-secondary"
                            style={{ padding: "6px", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center" }}
                            title={t("menu.export")}
                            onClick={() => exportSave(i+1)}
                          >📤</button>
                          
                          <button
                            style={{
                              padding: "6px", fontSize: "12px", borderRadius: "6px",
                              background: "rgba(239, 68, 68, 0.1)", color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.2)", cursor: "pointer",
                              display: "flex", justifyContent: "center", alignItems: "center",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; }}
                            title={t("menu.delete")}
                            onClick={() => { 
                              deleteSave(slot.slot); 
                              setSaveMsg(`🗑️ ${t("game.slotDeleted")}`); 
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

            <button
              className="btn-secondary"
              style={{ marginTop: "16px", width: "100%" }}
              onClick={() => { setShowSaveModal(false); setSaveMsg(null); }}
            >{t("menu.close")}</button>
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
    width: "220px",
    flexShrink: 0,
    background: "var(--color-bg-secondary)",
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  clubBadge: {
    padding: "20px 16px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    borderBottom: "1px solid var(--color-border)",
  },
  badgeCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: "14px",
    fontWeight: 900,
    color: "#fff",
    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
  },
  clubTitle: {
    fontSize: "13px",
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.2,
  },
  clubLeague: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  seasonInfo: {
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    borderBottom: "1px solid var(--color-border)",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
  },
  infoValue: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--color-text-primary)",
  },
  nav: {
    flex: 1,
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflowY: "auto",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-secondary)",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 500,
    transition: "all 0.15s ease",
  },
  navItemActive: {
    background: "var(--color-accent-primary)",
    color: "#fff",
    fontWeight: 700,
  },
  navIcon: {
    fontSize: "16px",
    width: "20px",
    textAlign: "center",
  },
  sideFooter: {
    padding: "12px 16px",
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
    padding: "10px",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "var(--font-sans)",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "16px",
    padding: "28px",
    width: "520px",
    maxWidth: "90vw",
  },
  slotRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px",
    background: "var(--color-bg-secondary)",
    borderRadius: "10px",
    border: "1px solid var(--color-border)",
    gap: "12px",
  },
};
