import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { useTranslation } from "../context/I18nContext";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { getGeminiApiKey, setGeminiApiKey } from "../engine/geminiEngine";
import type { SaveSlotInfo } from "../engine/saveEngine";

export default function MainMenu() {
  const navigate = useNavigate();
  const { loadAutosave, loadGame, getSaveSlots, hasAutosave, deleteSave } = useGame();
  const { t } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  const [slots, setSlots] = useState<(SaveSlotInfo | null)[]>([]);

  // Gemini states
  const [apiKey, setApiKey] = useState("");
  const [useAiNews, setUseAiNews] = useState(true);
  const [useAiPress, setUseAiPress] = useState(true);

  useEffect(() => {
    // Load local AI config
    const key = getGeminiApiKey() || "";
    const id = setTimeout(() => {
      setApiKey(key);
      const aiNews = localStorage.getItem("footsim_use_ai_news") !== "false";
      const aiPress = localStorage.getItem("footsim_use_ai_press") !== "false";
      setUseAiNews(aiNews);
      setUseAiPress(aiPress);
    }, 0);
    return () => clearTimeout(id);
  }, [showAiModal]);

  const handleSaveAiConfig = () => {
    setGeminiApiKey(apiKey);
    localStorage.setItem("footsim_use_ai_news", String(useAiNews));
    localStorage.setItem("footsim_use_ai_press", String(useAiPress));
    setSaveMsg("🤖 Configuração de IA salva!");
    setShowAiModal(false);
    setTimeout(() => setSaveMsg(null), 2500);
  };

  useEffect(() => {
    async function checkAutosaveAndSlots() {
      try {
        const hasAuto = await hasAutosave();
        setCanContinue(hasAuto);

        const loadedSlots = await getSaveSlots();
        setSlots(loadedSlots);
      } catch (e) {
        console.error(e);
      }
    }
    checkAutosaveAndSlots();
  }, [hasAutosave, getSaveSlots]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // A página vai recarregar automaticamente ou o App.tsx vai redirecionar para a tela de Auth
  };

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
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        if (parsed.version && parsed.playerClubId) {
          localStorage.setItem(`footsim_save_${slot}`, json);
          setSaveMsg(`✅ ${t("game.importSuccess")}`);
          const loadedSlots = await getSaveSlots();
          setSlots(loadedSlots);
          setTimeout(() => setSaveMsg(null), 2500);
        } else {
          throw new Error("Invalid format");
        }
      } catch {
        setSaveMsg(`❌ ${t("game.importError")}`);
        setTimeout(() => setSaveMsg(null), 2500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleContinue = async () => {
    const ok = await loadAutosave();
    if (ok) {
      navigate("/game");
    }
  };

  const handleNewGame = () => {
    navigate("/select-team");
  };

  const handleLoadSlot = async (slot: number) => {
    const ok = await loadGame(slot);
    if (ok) {
      setShowLoadModal(false);
      navigate("/game");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />
      <div style={styles.pitchPattern} />

      {/* Top Left: Configurações de IA Button */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10 }}>
        <button
          onClick={() => setShowAiModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            padding: "8px 16px",
            borderRadius: "30px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            color: "var(--color-text-primary)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
        >
          🤖 {getGeminiApiKey() ? "IA Ativa (Flash)" : "Configurar IA"}
        </button>
      </div>

      {/* User Profile Bar */}
      {user && (
        <div style={styles.userProfileBar} className="animate-fade-in">
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{user.email?.split('@')[0]}</span>
              <span style={styles.userStatus}>● Online (Nuvem)</span>
            </div>
          </div>
          <button 
            style={styles.logoutBtn} 
            onClick={handleLogout}
            title="Sair da Conta"
          >
            Sair
          </button>
        </div>
      )}

      {/* Save Success Alert (AI or normal Save) */}
      {saveMsg && (
        <div className="animate-fade-in" style={{
          position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "12px 24px", borderRadius: "12px",
          background: "rgba(16, 185, 129, 0.2)", color: "var(--color-accent-primary)",
          border: "1px solid rgba(16, 185, 129, 0.4)", fontWeight: 800, fontSize: "14px",
          backdropFilter: "blur(8px)", boxShadow: "0 8px 32px rgba(16, 185, 129, 0.15)"
        }}>
          {saveMsg}
        </div>
      )}

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

      {/* Gemini AI Modal */}
      {showAiModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAiModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.modalTitle, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🤖</span> Configurações de Inteligência Artificial
            </div>
            
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "20px", lineHeight: "1.5" }}>
              Integre o simulador com a API do <strong>Gemini 2.5 Flash</strong> da Google para ter coletivas de imprensa com texto livre, manchetes e notícias geradas dinamicamente com base nas estatísticas reais das rodadas.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                  Chave de API Gemini (Google AI Studio)
                </label>
                <input
                  type="password"
                  placeholder="Cole sua API Key (AIzaSy...)"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                    fontSize: "13px",
                    width: "100%",
                  }}
                />
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                  Sua chave é salva apenas localmente neste navegador e nunca é compartilhada. <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-primary)", fontWeight: 700 }}>Obter chave gratuita</a>
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="aiNewsToggle"
                  checked={useAiNews}
                  onChange={e => setUseAiNews(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="aiNewsToggle" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Notícias e Manchetes Geradas por IA
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="aiPressToggle"
                  checked={useAiPress}
                  onChange={e => setUseAiPress(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="aiPressToggle" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Coletivas de Imprensa Dinâmicas e Interativas
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn-primary"
                onClick={handleSaveAiConfig}
                style={{ flex: 1, padding: "10px" }}
              >
                Salvar Configurações
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowAiModal(false)}
                style={{ padding: "10px" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                            onClick={async () => { 
                              await deleteSave(slot.slot);
                              setSaveMsg(`🗑️ ${t("game.slotDeleted") || "Save excluído!"}`); 
                              const loadedSlots = await getSaveSlots();
                              setSlots(loadedSlots);
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
  userProfileBar: {
    position: "absolute", top: "20px", right: "20px", zIndex: 10,
    display: "flex", alignItems: "center", gap: "16px",
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    padding: "8px 16px", borderRadius: "30px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  userInfo: { display: "flex", alignItems: "center", gap: "10px" },
  userAvatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "var(--color-accent-primary)", color: "var(--color-bg-primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: "14px",
  },
  userDetails: { display: "flex", flexDirection: "column" },
  userName: { fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary)" },
  userStatus: { fontSize: "10px", color: "var(--color-accent-primary)", fontWeight: 600 },
  logoutBtn: {
    background: "rgba(239, 68, 68, 0.1)", color: "#ef4444",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s ease",
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
