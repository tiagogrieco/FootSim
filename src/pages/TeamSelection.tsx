import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useTranslation } from "../context/I18nContext";

export default function TeamSelection() {
  const navigate = useNavigate();
  const { allClubs, startNewGame } = useGame();
  const { t } = useTranslation();

  const [selectedLeague, setSelectedLeague] = useState<string>("Série A");
  const [hoveredClub, setHoveredClub] = useState<number | null>(null);
  const [roadToGlory, setRoadToGlory] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");

  // Custom club states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customShortName, setCustomShortName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e293b");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");

  const handleCreateCustomClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customShortName.trim()) return;
    
    startNewGame(undefined, {
      name: customName.trim(),
      shortName: customShortName.trim().substring(0, 3).toUpperCase(),
      colors: {
        primary: primaryColor,
        secondary: secondaryColor
      }
    }, roadToGlory, difficulty);
    
    setShowCreateModal(false);
    navigate("/presentation");
  };

  const leagues = Array.from(new Set(allClubs.map(c => c.league))).sort();
  const filteredClubs = allClubs.filter(c => c.league === selectedLeague);

  const isClubLocked = (club: { reputation: number }) => {
    if (difficulty === "hard") {
      return club.reputation > 65;
    }
    if (difficulty === "medium") {
      return club.reputation > 75;
    }
    return false;
  };

  const handleSelectClub = (clubId: number) => {
    const club = allClubs.find(c => c.id === clubId);
    if (club && isClubLocked(club)) return;
    startNewGame(clubId, undefined, roadToGlory, difficulty);
    navigate("/presentation");
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button className="btn-secondary" onClick={() => navigate("/")} style={{ marginRight: "16px" }}>
            ← {t("back") || "Voltar"}
          </button>
          <h1 style={styles.title}>Selecione seu Clube</h1>
        </div>
        <div style={styles.leagueSelector}>
          {leagues.map(league => {
            const isLeagueLocked = difficulty === "hard" && league === "Série A";
            return (
              <button
                key={league}
                disabled={isLeagueLocked}
                style={{
                  ...styles.leagueBtn,
                  ...(selectedLeague === league ? styles.leagueBtnActive : {}),
                  ...(isLeagueLocked ? { opacity: 0.3, cursor: "not-allowed" } : {})
                }}
                onClick={() => setSelectedLeague(league)}
              >
                {league} {isLeagueLocked && "🔒"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Background / License Selector */}
      <div style={{
        background: "rgba(30, 41, 59, 0.4)",
        border: "1px solid var(--color-border)",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-accent-primary)", margin: 0, letterSpacing: "0.5px" }}>
          🪪 LICENÇA E BACKGROUND DO TREINADOR
        </h3>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
          Escolha seu prestígio inicial. Licenças mais baixas restringem os clubes disponíveis para iniciar a carreira e impõem limitações financeiras.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "4px" }}>
          {[
            {
              key: "easy",
              title: "👑 Licença Pro (Ex-Jogador)",
              desc: "Todos os clubes desbloqueados. Sem restrições de orçamento.",
              color: "#3b82f6",
            },
            {
              key: "medium",
              title: "🎓 Licença A (Treinador Licenciado)",
              desc: "Bloqueia times elite (reputação > 75). Orçamento inicial -10%.",
              color: "#f59e0b",
            },
            {
              key: "hard",
              title: "🌱 Licença Provisória (Estagiário)",
              desc: "Apenas Série B de baixa reputação (<= 65) ou Clube Customizado. Orçamento inicial -30%.",
              color: "#ef4444",
            },
          ].map(opt => (
            <div
              key={opt.key}
              onClick={() => {
                setDifficulty(opt.key as "easy" | "medium" | "hard");
                if (opt.key === "hard" && selectedLeague === "Série A") {
                  setSelectedLeague("Série B");
                }
              }}
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: difficulty === opt.key ? `2px solid ${opt.color}` : "2px solid var(--color-border)",
                background: difficulty === opt.key ? `${opt.color}10` : "rgba(30, 41, 59, 0.2)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 800, color: difficulty === opt.key ? opt.color : "var(--color-text-primary)" }}>
                {opt.title}
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "6px", lineHeight: "1.4" }}>
                {opt.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Road to Glory Challenge Mode Toggle */}
      <div style={{
        background: roadToGlory 
          ? "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)" 
          : "rgba(30, 41, 59, 0.3)",
        border: roadToGlory 
          ? "1px solid rgba(239, 68, 68, 0.3)" 
          : "1px solid var(--color-border)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: roadToGlory ? "0 4px 20px rgba(239, 68, 68, 0.08)" : "none"
      }} onClick={() => setRoadToGlory(!roadToGlory)}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            checked={roadToGlory}
            onChange={(e) => {
              e.stopPropagation();
              setRoadToGlory(e.target.checked);
            }}
            style={{
              width: "18px",
              height: "18px",
              accentColor: "#ef4444",
              cursor: "pointer"
            }}
          />
          <span style={{ 
            fontSize: "14px", 
            fontWeight: 800, 
            color: roadToGlory ? "#ef4444" : "var(--color-text-primary)",
            letterSpacing: "0.5px"
          }}>
            ⚔️ MODO DESAFIO: ROAD TO GLORY (ESTRADA PARA A GLÓRIA)
          </span>
        </div>
        <p style={{ 
          fontSize: "12px", 
          color: "var(--color-text-muted)", 
          margin: 0, 
          paddingLeft: "28px",
          lineHeight: "1.5"
        }}>
          Gosta de um verdadeiro desafio de gestão? Ao ativar este modo, seu clube começará com apenas <strong>R$ 50.000</strong> em caixa, 
          reputação mínima de torcida/diretoria, e as habilidades (atributos) de todos os jogadores do seu elenco serão cortadas em <strong>25%</strong>.
        </p>
      </div>

      <div style={styles.grid}>
        {/* Custom Club option (Only in Série B to replace Novorizontino id 20) */}
        {selectedLeague === "Série B" && (
          <div
            style={{
              ...styles.card,
              border: "2.5px dashed var(--color-accent-primary)",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0) 100%)",
              justifyContent: "center",
              alignItems: "center",
              padding: "32px 20px",
              minHeight: "280px",
              cursor: "pointer",
            }}
            onClick={() => setShowCreateModal(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 24px rgba(16, 185, 129, 0.15)";
              e.currentTarget.style.borderColor = "var(--color-accent-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "var(--color-accent-primary)";
            }}
            className="animate-fade-in"
          >
            <span style={{ fontSize: "40px", marginBottom: "12px" }}>🌱</span>
            <h2 style={{ fontSize: "18px", fontWeight: 900, color: "var(--color-accent-primary)", textAlign: "center" }}>
              Criar Clube Customizado
            </h2>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center", marginTop: "8px", maxWidth: "220px", lineHeight: "1.4" }}>
              Inicie do absoluto zero na Série B! Elenco fraco (CA 35-45) e orçamento apertado de €500k. O verdadeiro desafio!
            </p>
          </div>
        )}

        {filteredClubs.map(club => {
          const locked = isClubLocked(club);
          return (
            <div
              key={club.id}
              style={{
                ...styles.card,
                ...(hoveredClub === club.id && !locked ? styles.cardHover : {}),
                ...(locked ? { opacity: 0.45, cursor: "not-allowed", position: "relative" } : {})
              }}
              onMouseEnter={() => !locked && setHoveredClub(club.id)}
              onMouseLeave={() => setHoveredClub(null)}
              onClick={() => !locked && handleSelectClub(club.id)}
              className="animate-fade-in"
            >
              {locked && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.8)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "16px",
                  zIndex: 2,
                  padding: "16px",
                  textAlign: "center"
                }}>
                  <span style={{ fontSize: "28px", marginBottom: "8px" }}>🔒</span>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#ef4444" }}>LICENÇA INSUFICIENTE</span>
                  <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                    Exige Licença {club.reputation > 75 ? "Pro (Ex-Jogador)" : "A (Licenciado)"}
                  </span>
                </div>
              )}
            <div style={{
              ...styles.cardHeader,
              background: `linear-gradient(135deg, ${club.colors?.primary || "#333"} 0%, ${club.colors?.secondary || "#111"} 100%)`
            }} />
            <div style={styles.cardContent}>
              <div style={styles.badge}>
                <img 
                  src={`assets/clubs/logos/${club.id}.png`} 
                  alt={club.shortName}
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px" }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                <span style={{ fontWeight: 900, fontSize: "20px", color: "#fff", display: "none" }}>
                  {club.shortName}
                </span>
              </div>
              <h2 style={styles.clubName}>{club.name}</h2>
              <div style={styles.stats}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Reputação</span>
                  <span style={styles.statValue}>{club.reputation} / 100</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Orçamento</span>
                  <span style={styles.statValue}>€{(club.budget / 1000000).toFixed(1)}M</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Formação</span>
                  <span style={styles.statValue}>{club.formation}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Estilo</span>
                  <span style={{ ...styles.statValue, textTransform: "capitalize" }}>{club.mentality}</span>
                </div>
              </div>
            </div>
            <div style={{
              ...styles.selectOverlay,
              opacity: hoveredClub === club.id ? 1 : 0
            }}>
              <span style={styles.selectText}>Assumir Comando</span>
            </div>
          </div>
          );
        })}
      </div>

      {/* Create Custom Club Modal */}
      {showCreateModal && (
        <div style={modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "8px", color: "var(--color-text-primary)" }}>
              🛡️ Configurar Novo Clube
            </h2>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "20px", lineHeight: "1.5" }}>
              Defina os dados fundamentais para sua jornada de reconstrução ("Road to Glory") no futebol nacional.
            </p>

            <form onSubmit={handleCreateCustomClub} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                  Nome do Clube
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Real Brasil, Tabajara FC"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                  Abreviação (Máx. 3 Letras)
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  placeholder="Ex: RBR, TAB"
                  value={customShortName}
                  onChange={e => setCustomShortName(e.target.value.toUpperCase())}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                    Cor Principal
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      style={{ width: "38px", height: "38px", border: "none", borderRadius: "8px", cursor: "pointer", background: "transparent" }}
                    />
                    <span style={{ fontSize: "12px", fontFamily: "monospace" }}>{primaryColor}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                    Cor Secundária
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      style={{ width: "38px", height: "38px", border: "none", borderRadius: "8px", cursor: "pointer", background: "transparent" }}
                    />
                    <span style={{ fontSize: "12px", fontFamily: "monospace" }}>{secondaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Uniform Preview */}
              <div style={{
                marginTop: "12px", padding: "12px", borderRadius: "12px",
                background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
                display: "flex", alignItems: "center", gap: "16px"
              }}>
                <div style={{
                  width: "50px", height: "50px", borderRadius: "50%",
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  border: "3px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: "13px" }}>
                    {customShortName.substring(0, 3) || "FC"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800 }}>{customName || "Nome do Clube"}</span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Série B · Desafio Road to Glory 🐾</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: "10px 14px", fontSize: "13px", fontWeight: 800 }}
                >
                  Fundar Clube e Jogar!
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "10px 14px", fontSize: "13px", fontWeight: 800 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};

const modal: React.CSSProperties = {
  background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
  borderRadius: "16px", padding: "32px", width: "480px", maxWidth: "90vw",
  color: "var(--color-text-primary)"
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "8px",
  background: "var(--color-bg-secondary)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  fontSize: "13px",
  width: "100%",
  outline: "none"
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "32px",
    height: "100%",
    overflow: "auto",
    background: "var(--color-bg-primary)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center"
  },
  title: {
    fontSize: "28px",
    fontWeight: 900,
    letterSpacing: "-0.5px"
  },
  leagueSelector: {
    display: "flex",
    gap: "8px",
    background: "var(--color-bg-card)",
    padding: "6px",
    borderRadius: "12px",
    border: "1px solid var(--color-border)"
  },
  leagueBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  leagueBtnActive: {
    background: "var(--color-accent-primary)",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
    paddingBottom: "40px"
  },
  card: {
    position: "relative",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "16px",
    overflow: "hidden",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column"
  },
  cardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
    borderColor: "var(--color-accent-primary)"
  },
  cardHeader: {
    height: "80px",
    width: "100%",
    position: "relative"
  },
  badge: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "var(--color-bg-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "4px solid var(--color-bg-card)",
    position: "absolute",
    top: "-32px",
    left: "20px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
  },
  cardContent: {
    padding: "40px 20px 20px 20px",
    position: "relative"
  },
  clubName: {
    fontSize: "18px",
    fontWeight: 800,
    marginBottom: "16px"
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px"
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  statLabel: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    fontWeight: 600
  },
  statValue: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--color-text-primary)"
  },
  selectOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(16, 185, 129, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s ease",
    backdropFilter: "blur(4px)"
  },
  selectText: {
    color: "#fff",
    fontSize: "18px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "1px"
  }
};
