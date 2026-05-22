import type { SeasonEndResult } from "../engine/seasonEngine";
import { formatCurrency } from "../engine/financeEngine";
import type { JobOffer } from "../types/career";

interface SeasonEndModalProps {
  result: SeasonEndResult;
  season: number;
  onContinue: () => void;
  jobOffers?: JobOffer[];
  onAcceptJob?: (offer: JobOffer) => void;
}

export default function SeasonEndModal({ result, season, onContinue, jobOffers, onAcceptJob }: SeasonEndModalProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Trophy / Header */}
        <div style={styles.header}>
          <div style={styles.trophy}>
            {result.isChampion ? "🏆" : result.finalPosition <= 3 ? "🥇" : "📊"}
          </div>
          <h1 style={styles.title}>Fim da Temporada {season}</h1>
        </div>

        {/* Summary */}
        <p style={styles.summary}>{result.seasonSummary}</p>

        {/* Position Card */}
        <div style={styles.positionCard}>
          <span style={styles.positionLabel}>Posição Final</span>
          <span style={{
            ...styles.positionValue,
            color: result.finalPosition === 1 ? "#fbbf24" :
              result.finalPosition <= 3 ? "#10b981" :
              result.finalPosition >= 9 ? "#ef4444" : "#94a3b8",
          }}>
            {result.finalPosition}º
          </span>
        </div>

        {/* Financial Summary */}
        <div style={styles.financialGrid}>
          <div style={styles.financialCard}>
            <span style={styles.financialIcon}>🏆</span>
            <span style={styles.financialLabel}>Premiação</span>
            <span style={styles.financialValue}>{formatCurrency(result.prizeMoney)}</span>
          </div>
          <div style={styles.financialCard}>
            <span style={styles.financialIcon}>🤝</span>
            <span style={styles.financialLabel}>Patrocínio</span>
            <span style={styles.financialValue}>{formatCurrency(result.sponsorRevenue)}</span>
          </div>
          <div style={{ ...styles.financialCard, background: "rgba(16,185,129,0.15)", border: "1px solid #10b981" }}>
            <span style={styles.financialIcon}>💰</span>
            <span style={styles.financialLabel}>Total Recebido</span>
            <span style={{ ...styles.financialValue, color: "#10b981", fontSize: "22px" }}>
              {formatCurrency(result.totalBonus)}
            </span>
          </div>
        </div>

        {/* Job Offers */}
        {jobOffers && jobOffers.length > 0 && (
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: "#fbbf24" }}>
              💼 Propostas de Emprego
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jobOffers.map((offer, i) => (
                <div key={i} style={{ 
                  background: "rgba(251,191,36,0.08)", 
                  border: "1px solid rgba(251,191,36,0.3)",
                  borderRadius: 10,
                  padding: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>🏟️</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{offer.club.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        Reputação: {offer.club.reputation} | Orçamento: {formatCurrency(offer.offeredBudget)}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
                    {offer.description}
                  </p>
                  {onAcceptJob && (
                    <button
                      onClick={() => onAcceptJob(offer)}
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✨ Aceitar Proposta
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div style={styles.infoBox}>
          <p>📅 A nova temporada {season + 1} será iniciada.</p>
          <p>👥 Jogadores envelhecerão 1 ano. Jovens podem crescer, veteranos podem declinar.</p>
          <p>🔄 Novos jogos serão gerados e a tabela será zerada.</p>
        </div>

        {/* Continue Button */}
        <button style={styles.continueBtn} onClick={onContinue}>
          ▶ Iniciar Temporada {season + 1}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.85)", display: "flex",
    justifyContent: "center", alignItems: "center",
    backdropFilter: "blur(6px)",
  },
  modal: {
    background: "var(--color-bg-card, #1e293b)", borderRadius: "16px",
    padding: "40px", maxWidth: "520px", width: "90%",
    border: "1px solid var(--color-border, #334155)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
    textAlign: "center",
  },
  header: { marginBottom: "20px" },
  trophy: { fontSize: "64px", marginBottom: "8px" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--color-text-primary, #f1f5f9)" },
  summary: {
    fontSize: "15px", color: "var(--color-text-secondary, #94a3b8)",
    marginBottom: "24px", lineHeight: "1.5",
  },
  positionCard: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "16px", borderRadius: "12px",
    background: "var(--color-bg-secondary, #0f172a)",
    marginBottom: "20px",
  },
  positionLabel: { fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", fontWeight: 600 },
  positionValue: { fontSize: "48px", fontWeight: 900 },
  financialGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px",
    marginBottom: "20px",
  },
  financialCard: {
    padding: "14px 8px", borderRadius: "10px",
    background: "var(--color-bg-secondary, #0f172a)",
    border: "1px solid var(--color-border, #334155)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
  },
  financialIcon: { fontSize: "24px" },
  financialLabel: { fontSize: "10px", textTransform: "uppercase", color: "#94a3b8", fontWeight: 600 },
  financialValue: { fontSize: "16px", fontWeight: 800, color: "var(--color-accent-primary, #10b981)" },
  infoBox: {
    textAlign: "left", padding: "14px 18px", borderRadius: "10px",
    background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
    marginBottom: "24px", fontSize: "12px", color: "#94a3b8",
    lineHeight: "1.8",
  },
  continueBtn: {
    width: "100%", padding: "14px", borderRadius: "10px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", fontWeight: 800, fontSize: "16px",
    border: "none", cursor: "pointer",
    transition: "transform 0.15s",
  },
};
