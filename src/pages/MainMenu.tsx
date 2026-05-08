import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useGame } from "../context/GameContext";
import { useTranslation } from "../context/I18nContext";

export default function MainMenu() {
  const navigate = useNavigate();
  const { startNewGame, loadAutosave, loadGame, getSaveSlots, hasAutosave } = useGame();
  const { t } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const canContinue = hasAutosave();

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
          setTimeout(() => setSaveMsg(null), 2500);
        } else {
          throw new Error("Invalid format");
        }
      } catch (err) {
        setSaveMsg(`❌ ${t("game.importError")}`);
        setTimeout(() => setSaveMsg(null), 2500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleContinue = () => {
    if (loadAutosave()) {
      navigate("/game");
    }
  };

  const handleNewGame = () => {
    startNewGame();
    navigate("/game");
  };

  const handleLoadSlot = (slot: number) => {
    if (loadGame(slot)) {
      setShowLoadModal(false);
      navigate("/game");
    }
  };

  const slots = getSaveSlots();

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />
      <div style={styles.pitchPattern} />

      <div style={styles.content}>
        {/* Title */}
        <div style={styles.titleBlock} className="animate-fade-in">
          <h1 style={styles.title}>
            <span style={styles.titleFoot}>Foot</span>
            <span style={styles.titleSim}>Sim</span>
          </h1>
          <p style={styles.subtitle}>{t("menu_subtitle")}</p>
          <div style={styles.versionBadge}>v0.3.0 — Mod Support</div>
        </div>

        {/* Menu */}
        <nav style={styles.menu}>
          {/* Continue */}
          <button
            className="animate-fade-in"
            style={{
              ...styles.menuItem,
              animationDelay: "0.2s",
              ...(hoveredIndex === -1 ? styles.menuItemHover : {}),
              ...(!canContinue ? styles.menuItemDisabled : {}),
            }}
            onMouseEnter={() => setHoveredIndex(-1)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={canContinue ? handleContinue : undefined}
            disabled={!canContinue}
          >
            <span style={styles.menuIcon}>▶️</span>
            <div style={styles.menuTextBlock}>
              <span style={styles.menuLabel}>{t("menu_continue")}</span>
              <span style={styles.menuDesc}>{t("menu_continue_desc")}</span>
            </div>
            {canContinue && (
              <span style={{ ...styles.menuArrow, opacity: hoveredIndex === -1 ? 1 : 0 }}>→</span>
            )}
            {!canContinue && <span style={styles.comingSoon}>{t("menu_continue_empty")}</span>}
          </button>

          {/* New Game */}
          <button
            className="animate-fade-in"
            style={{
              ...styles.menuItem,
              animationDelay: "0.3s",
              ...(hoveredIndex === 0 ? styles.menuItemHover : {}),
            }}
            onMouseEnter={() => setHoveredIndex(0)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={handleNewGame}
          >
            <span style={styles.menuIcon}>⚽</span>
            <div style={styles.menuTextBlock}>
              <span style={styles.menuLabel}>{t("menu_new_game")}</span>
              <span style={styles.menuDesc}>{t("menu_new_game_desc")}</span>
            </div>
            <span style={{ ...styles.menuArrow, opacity: hoveredIndex === 0 ? 1 : 0 }}>→</span>
          </button>

          {/* Load Game */}
          <button
            className="animate-fade-in"
            style={{
              ...styles.menuItem,
              animationDelay: "0.4s",
              ...(hoveredIndex === 1 ? styles.menuItemHover : {}),
            }}
            onMouseEnter={() => setHoveredIndex(1)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => setShowLoadModal(true)}
          >
            <span style={styles.menuIcon}>💾</span>
            <div style={styles.menuTextBlock}>
              <span style={styles.menuLabel}>{t("menu_load_game")}</span>
              <span style={styles.menuDesc}>{t("menu_load_game_desc")}</span>
            </div>
            <span style={{ ...styles.menuArrow, opacity: hoveredIndex === 1 ? 1 : 0 }}>→</span>
          </button>

          {/* Mods */}
          <button
            className="animate-fade-in"
            style={{
              ...styles.menuItem,
              animationDelay: "0.5s",
              ...(hoveredIndex === 2 ? styles.menuItemHover : {}),
            }}
            onMouseEnter={() => setHoveredIndex(2)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => navigate("/mods")}
          >
            <span style={styles.menuIcon}>📦</span>
            <div style={styles.menuTextBlock}>
              <span style={styles.menuLabel}>{t("menu_mods")}</span>
              <span style={styles.menuDesc}>{t("menu_mods_desc")}</span>
            </div>
            <span style={{ ...styles.menuArrow, opacity: hoveredIndex === 2 ? 1 : 0 }}>→</span>
          </button>
        </nav>

        {/* Footer */}
        <div style={styles.footer} className="animate-fade-in">
          <span>{t("menu_footer_made")} ❤️ {t("menu_footer_and")} IA</span>
          <span style={styles.footerSep}>•</span>
          <span>{t("menu_footer_inspired")} Brasfoot & FM</span>
        </div>
      </div>

      {/* Load Modal */}
      {showLoadModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLoadModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
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

            <div style={styles.slotList}>
              {slots.map((slot, i) => (
                <div key={i} style={styles.slotItem}>
                  <div style={styles.slotInfo}>
                    <span style={styles.slotNumber}>Slot {i + 1}</span>
                    {slot ? (
                      <>
                        <span style={styles.slotName}>{slot.name}</span>
                        <span style={styles.slotDetails}>
                          {slot.clubName} • {t("dashboard_season")} {slot.season} • {t("dashboard_round")} {slot.round} • {slot.position}º {t("dashboard_place")}
                        </span>
                        <span style={styles.slotDate}>
                          {new Date(slot.timestamp).toLocaleString(t("lang") === "pt-BR" ? "pt-BR" : "en-US")}
                        </span>
                      </>
                    ) : (
                      <span style={styles.slotEmpty}>— {t("save_empty")} —</span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "120px" }}>
                    {slot && (
                      <button
                        className="btn-primary"
                        style={{ padding: "8px", fontSize: "12px", width: "100%" }}
                        onClick={() => handleLoadSlot(slot.slot)}
                      >
                        {t("save_load_btn")}
                      </button>
                    )}
                    
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
                              localStorage.removeItem(`footsim_save_${slot.slot}`);
                              setSaveMsg(`🗑️ ${t("game.slotDeleted") || "Save excluído!"}`); 
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
              onClick={() => { setShowLoadModal(false); setSaveMsg(null); }}
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative", width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", background: "var(--color-bg-primary)",
  },
  bgOverlay: {
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(245, 158, 11, 0.05) 0%, transparent 50%)",
    pointerEvents: "none",
  },
  pitchPattern: {
    position: "absolute", inset: 0, opacity: 0.03,
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px),
                       repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)`,
    pointerEvents: "none",
  },
  content: {
    position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column", alignItems: "center", gap: "48px", padding: "40px",
  },
  titleBlock: {
    textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
  },
  title: { fontSize: "72px", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1 },
  titleFoot: { color: "var(--color-text-primary)" },
  titleSim: { color: "var(--color-accent-primary)" },
  subtitle: {
    fontSize: "16px", color: "var(--color-text-muted)", fontWeight: 400,
    letterSpacing: "4px", textTransform: "uppercase", marginTop: "4px",
  },
  versionBadge: {
    marginTop: "12px", fontSize: "11px", color: "var(--color-text-muted)",
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    padding: "4px 14px", borderRadius: "20px",
  },
  menu: { display: "flex", flexDirection: "column", gap: "12px", width: "380px" },
  menuItem: {
    display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px",
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all 0.25s ease",
    textAlign: "left", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)",
    opacity: 0, animationFillMode: "forwards",
  },
  menuItemHover: {
    borderColor: "var(--color-accent-primary)", background: "var(--color-bg-hover)",
    transform: "translateX(6px)", boxShadow: "0 0 20px rgba(16, 185, 129, 0.1)",
  },
  menuItemDisabled: { opacity: 0.45, cursor: "not-allowed" },
  menuIcon: { fontSize: "28px", width: "40px", textAlign: "center", flexShrink: 0 },
  menuTextBlock: { flex: 1, display: "flex", flexDirection: "column", gap: "2px" },
  menuLabel: { fontSize: "16px", fontWeight: 700 },
  menuDesc: { fontSize: "12px", color: "var(--color-text-muted)" },
  menuArrow: {
    fontSize: "20px", color: "var(--color-accent-primary)", transition: "opacity 0.2s ease", flexShrink: 0,
  },
  comingSoon: {
    fontSize: "10px", color: "var(--color-text-muted)", background: "var(--color-bg-secondary)",
    padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px",
  },
  footer: {
    display: "flex", alignItems: "center", gap: "8px",
    fontSize: "12px", color: "var(--color-text-muted)",
    opacity: 0, animationDelay: "0.6s", animationFillMode: "forwards",
  },
  footerSep: { opacity: 0.4 },

  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "16px", padding: "32px", width: "480px", maxWidth: "90vw",
  },
  modalTitle: { fontSize: "20px", fontWeight: 800, marginBottom: "24px" },
  slotList: { display: "flex", flexDirection: "column", gap: "12px" },
  slotItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px", background: "var(--color-bg-secondary)", borderRadius: "10px",
    border: "1px solid var(--color-border)",
  },
  slotInfo: { display: "flex", flexDirection: "column", gap: "4px" },
  slotNumber: { fontSize: "10px", fontWeight: 700, color: "var(--color-accent-primary)", textTransform: "uppercase" },
  slotName: { fontSize: "15px", fontWeight: 700 },
  slotDetails: { fontSize: "12px", color: "var(--color-text-secondary)" },
  slotDate: { fontSize: "11px", color: "var(--color-text-muted)" },
  slotEmpty: { fontSize: "13px", color: "var(--color-text-muted)", fontStyle: "italic" },
};
