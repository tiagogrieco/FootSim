import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";

export default function YouthView() {
  const {
    playerClub,
    promoteYouthPlayer,
    changeYouthFocus,
    budget,
    upgradeInfrastructure,
  } = useGame();

  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const youths = playerClub.youthAcademy || [];
  const infra = playerClub.infrastructure || 50;

  // Determine academy description
  const getAcademyTierName = (rating: number) => {
    if (rating >= 90) return "Academia Lendária (Nível Mundial)";
    if (rating >= 75) return "Academia de Elite (Avançada)";
    if (rating >= 55) return "Centro de Formação Padrão";
    return "Estrutura Básica de Base";
  };

  const getRarityConfig = (potential: number) => {
    if (potential >= 85) {
      return {
        label: "Joia Rara",
        color: "#f59e0b",
        glow: "0 0 20px rgba(245, 158, 11, 0.4)",
        border: "1px solid rgba(245, 158, 11, 0.6)",
        badgeBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        cardBg: "linear-gradient(135deg, rgba(24, 20, 15, 0.95) 0%, rgba(15, 12, 10, 0.98) 100%)"
      };
    }
    if (potential >= 75) {
      return {
        label: "Grande Promessa",
        color: "#a855f7",
        glow: "0 0 15px rgba(168, 85, 247, 0.3)",
        border: "1px solid rgba(168, 85, 247, 0.5)",
        badgeBg: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
        cardBg: "linear-gradient(135deg, rgba(20, 15, 25, 0.95) 0%, rgba(12, 10, 18, 0.98) 100%)"
      };
    }
    if (potential >= 65) {
      return {
        label: "Promessa",
        color: "#3b82f6",
        glow: "0 0 10px rgba(59, 130, 246, 0.2)",
        border: "1px solid rgba(59, 130, 246, 0.4)",
        badgeBg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        cardBg: "linear-gradient(135deg, rgba(15, 20, 30, 0.95) 0%, rgba(10, 12, 20, 0.98) 100%)"
      };
    }
    return {
      label: "Jovem Talento",
      color: "#94a3b8",
      glow: "none",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      badgeBg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
      cardBg: "linear-gradient(135deg, rgba(23, 28, 41, 0.95) 0%, rgba(13, 17, 26, 0.98) 100%)"
    };
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🌱 Categorias de Base</h1>
          <p style={styles.subTitle}>
            Gerencie o futuro do seu clube. Novos talentos são gerados mensalmente no CT.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => navigate("/game")}
          style={{ fontSize: "12px", padding: "8px 16px" }}
        >
          ← Voltar ao Painel
        </button>
      </div>

      {/* Academy Stats banner */}
      <div style={styles.infraBanner}>
        {/* CT Blueprint Decoration */}
        <div style={styles.blueprintBg} />
        
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-accent-primary)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              NÍVEL DA ESTRUTURA
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>
              {getAcademyTierName(infra)}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
              <div style={{ width: "200px", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${infra}%`, height: "100%", background: "linear-gradient(90deg, var(--color-accent-primary), #10b981)", borderRadius: "4px" }} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#e2e8f0" }}>{infra}/100</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--color-accent-primary)" }}>
                {youths.length} <span style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>/ 6</span>
              </div>
              <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px", fontWeight: 700, textTransform: "uppercase" }}>
                Atletas Inscritos
              </div>
            </div>

            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", height: "40px" }} />

            <div>
              <button 
                className="btn-primary"
                onClick={upgradeInfrastructure}
                disabled={budget < 2000000 || infra >= 95}
                style={{
                  fontSize: "12px",
                  padding: "10px 20px",
                  background: infra >= 95 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, var(--color-accent-primary) 0%, #10b981 100%)",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)"
                }}
              >
                {infra >= 95 ? "CT no Máximo" : `⚡ Melhorar CT (R$ 2.0M)`}
              </button>
              <div style={{ fontSize: "9px", color: "var(--color-text-muted)", marginTop: "4px", textAlign: "center" }}>
                CTs melhores aceleram o desenvolvimento mensal
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {youths.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🕵️‍♂️</div>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f3f4f6" }}>Academia Vazia</h3>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", maxWidth: "420px", margin: "8px auto 0", lineHeight: "1.6" }}>
            Nossos observadores de base estão monitorando jovens talentos da região. A qualquer momento no final do mês, um jovem promissor pode ingressar no clube!
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {youths.map((youth) => {
            const rarity = getRarityConfig(youth.potentialAbility);
            const isHovered = hoveredCard === youth.id;
            
            return (
              <div
                key={youth.id}
                onMouseEnter={() => setHoveredCard(youth.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: rarity.cardBg,
                  border: isHovered ? rarity.border : "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "14px",
                  padding: "24px",
                  boxShadow: isHovered ? rarity.glow : "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isHovered ? "translateY(-4px)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                {/* Top Info */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: rarity.badgeBg,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                    }}>
                      <span style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{youth.currentAbility}</span>
                      <span style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>{youth.position}</span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        fontSize: "9px",
                        fontWeight: 900,
                        padding: "3px 8px",
                        borderRadius: "20px",
                        background: `${rarity.color}15`,
                        color: rarity.color,
                        border: `1.5px solid ${rarity.color}40`,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase"
                      }}>
                        {rarity.label}
                      </span>
                      <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "6px" }}>
                        PA: <span style={{ fontWeight: 800, color: "#f3f4f6" }}>{youth.potentialAbility}</span>
                      </div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#fff", marginBottom: "4px" }}>
                    {youth.name}
                  </h3>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <span>{youth.age} anos</span>
                    <span>•</span>
                    <span>Pé: {youth.preferredFoot === "both" ? "Ambos" : youth.preferredFoot === "left" ? "Canhoto" : "Destro"}</span>
                  </div>

                  {/* Visual Ability growth bar */}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--color-text-muted)", marginBottom: "6px", fontWeight: 700 }}>
                      <span>PROGRESSO</span>
                      <span>{youth.currentAbility} → {youth.potentialAbility} PA</span>
                    </div>
                    <div style={{
                      height: "10px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: "6px",
                      position: "relative",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.03)"
                    }}>
                      {/* Potential Cap (Dotted line background color) */}
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: `${youth.potentialAbility}%`,
                        height: "100%",
                        background: "rgba(255, 255, 255, 0.08)",
                        borderRadius: "6px"
                      }} />
                      {/* Current ability bar */}
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: `${youth.currentAbility}%`,
                        height: "100%",
                        background: rarity.badgeBg,
                        borderRadius: "6px",
                        boxShadow: `0 0 10px ${rarity.color}`
                      }} />
                    </div>
                  </div>

                  {/* Mini attributes list */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    background: "rgba(0,0,0,0.15)",
                    padding: "10px",
                    borderRadius: "8px",
                    marginBottom: "20px"
                  }}>
                    {Object.entries(youth.attributes).map(([key, val]) => {
                      if (key === "goalkeeping" && youth.positionCategory !== "GK") return null;
                      return (
                        <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                            {key.substring(0, 3)}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 800, color: getAttrColor(val), marginTop: "2px" }}>
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Actions (Focus selection and Promotion) */}
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Foco de Treinamento
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {["Geral", "Físico", "Técnico", "Tático"].map((focusOption) => {
                        const active = (youth.trainingFocus || "Geral") === focusOption;
                        return (
                          <button
                            key={focusOption}
                            onClick={() => changeYouthFocus(youth.id, focusOption)}
                            style={{
                              flex: 1,
                              background: active ? "var(--color-accent-primary)" : "rgba(255,255,255,0.04)",
                              border: active ? "none" : "1px solid rgba(255,255,255,0.06)",
                              borderRadius: "6px",
                              padding: "6px 0",
                              fontSize: "10px",
                              fontWeight: 700,
                              color: active ? "#fff" : "var(--color-text-muted)",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            {focusOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => promoteYouthPlayer(youth.id)}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "10px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
                    }}
                  >
                    Promover ao Profissional 🚀
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" },
  subTitle: { fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" },
  infraBanner: {
    background: "linear-gradient(135deg, rgba(10, 20, 20, 0.9) 0%, rgba(6, 12, 12, 0.95) 100%)",
    border: "1px solid rgba(16, 185, 129, 0.15)",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "28px",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
  },
  blueprintBg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "20px 20px",
    backgroundImage: "linear-gradient(to right, rgba(16, 185, 129, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.02) 1px, transparent 1px)",
    pointerEvents: "none",
    zIndex: 1
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "20px"
  },
  emptyState: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "14px",
    padding: "48px",
    textAlign: "center",
    boxShadow: "var(--shadow-card)"
  }
};
