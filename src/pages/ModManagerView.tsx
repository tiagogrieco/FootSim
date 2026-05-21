import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../context/I18nContext";

export default function ModManagerView() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  const hasMods = !!localStorage.getItem("footsim_custom_data");

  const processFile = (file: File) => {
    setErrorMsg("");
    setStatusMsg("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Very basic validation
        if (!data.clubs || !Array.isArray(data.clubs) || !data.players || !Array.isArray(data.players)) {
          throw new Error("Invalid Mod Pack structure. Must contain 'clubs' and 'players' arrays.");
        }

        localStorage.setItem("footsim_custom_data", content);
        setStatusMsg(t("mod_loaded_success") || "Mod pack loaded successfully! Start a new game to see the changes.");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : t("mod_load_error") || "Error reading JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const clearMods = () => {
    localStorage.removeItem("footsim_custom_data");
    setStatusMsg(t("mod_cleared_success") || "Mods cleared. The game will use default data.");
    setErrorMsg("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button className="btn-secondary" onClick={() => navigate("/")}>
          ← {t("back")}
        </button>
        <h1 style={styles.title}>📦 {t("mod_manager_title") || "Mod Manager"}</h1>
      </div>

      <div style={styles.content}>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px" }}>
          {t("mod_manager_desc") || "Upload a custom JSON file to overwrite default clubs and players. Changes will take effect on your next New Game."}
        </p>

        <div 
          style={{
            ...styles.dropzone,
            borderColor: isHovering ? "var(--color-accent-primary)" : "var(--color-border)",
            background: isHovering ? "rgba(16, 185, 129, 0.05)" : "var(--color-bg-secondary)",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsHovering(true);
          }}
          onDragLeave={() => setIsHovering(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsHovering(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              processFile(e.dataTransfer.files[0]);
            }
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📄</div>
          <h3>{t("mod_drop_title") || "Drag and drop your JSON Mod Pack here"}</h3>
          <p style={{ color: "var(--color-text-muted)", marginTop: "8px", marginBottom: "16px" }}>
            {t("mod_drop_or") || "or click to select file"}
          </p>
          
          <input
            type="file"
            accept=".json"
            id="modFileInput"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <button 
            className="btn-primary" 
            onClick={() => document.getElementById("modFileInput")?.click()}
          >
            {t("mod_select_file") || "Select File"}
          </button>
        </div>

        {statusMsg && (
          <div className="animate-fade-in" style={{ 
            ...styles.messageBox, 
            background: "rgba(16, 185, 129, 0.15)", 
            color: "var(--color-accent-primary)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            display: "flex", alignItems: "center", gap: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}>
            ✅ {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div className="animate-fade-in" style={{ 
            ...styles.messageBox, 
            background: "rgba(239, 68, 68, 0.15)", 
            color: "#ef4444",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex", alignItems: "center", gap: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}>
            ❌ {errorMsg}
          </div>
        )}

        <div style={styles.statusSection}>
          <h3>{t("mod_current_status") || "Current Status"}</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", padding: "16px", background: "var(--color-bg-secondary)", borderRadius: "8px" }}>
            <div>
              {hasMods ? (
                <span style={{ color: "var(--color-accent-primary)", fontWeight: 600 }}>🟢 {t("mod_status_active") || "Custom Mods Active"}</span>
              ) : (
                <span style={{ color: "var(--color-text-muted)" }}>⚪ {t("mod_status_inactive") || "Default Game Data"}</span>
              )}
            </div>
            {hasMods && (
              <button className="btn-secondary" style={{ color: "#ef4444", borderColor: "#ef4444" }} onClick={clearMods}>
                {t("mod_clear_btn") || "Clear Mods"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "var(--color-bg-primary)",
    color: "var(--color-text-primary)",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    width: "100%",
    maxWidth: "800px",
    display: "flex",
    alignItems: "center",
    gap: "24px",
    marginBottom: "40px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 800,
    margin: 0,
  },
  content: {
    width: "100%",
    maxWidth: "800px",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "16px",
    padding: "32px",
  },
  dropzone: {
    border: "2px dashed var(--color-border)",
    borderRadius: "12px",
    padding: "48px",
    textAlign: "center",
    transition: "all 0.2s",
    marginBottom: "24px",
  },
  messageBox: {
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "14px",
    fontWeight: 600,
  },
  statusSection: {
    marginTop: "32px",
    borderTop: "1px solid var(--color-border)",
    paddingTop: "24px",
  }
};
