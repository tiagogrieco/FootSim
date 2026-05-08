import { useGame } from "../context/GameContext";
import { calculateFinancialSummary, formatCurrency } from "../engine/financeEngine";

export default function FinancesView() {
  const { playerClub, playerSquad, budget } = useGame();

  const summary = calculateFinancialSummary(playerSquad, playerClub, budget);

  const wageColor =
    summary.wageUsagePercent > 100 ? "#ef4444" :
    summary.wageUsagePercent > 80 ? "#f59e0b" : "#10b981";

  const sortedByWage = [...playerSquad].sort((a, b) => b.wage - a.wage);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>💰 Finanças</h1>
        <div style={styles.budgetBadge}>
          Saldo: <span style={{ color: budget >= 0 ? "#10b981" : "#ef4444", fontWeight: 900 }}>
            {formatCurrency(budget)}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div className="card" style={styles.summaryCard}>
          <div style={styles.summaryIcon}>💵</div>
          <div style={styles.summaryInfo}>
            <span style={styles.summaryValue}>{formatCurrency(budget)}</span>
            <span style={styles.summaryLabel}>Orçamento Disponível</span>
          </div>
        </div>

        <div className="card" style={styles.summaryCard}>
          <div style={styles.summaryIcon}>📊</div>
          <div style={styles.summaryInfo}>
            <span style={{ ...styles.summaryValue, color: wageColor }}>
              {summary.wageUsagePercent}%
            </span>
            <span style={styles.summaryLabel}>
              Uso da Folha ({formatCurrency(summary.totalWages)} / {formatCurrency(summary.wageBudget)})
            </span>
          </div>
        </div>

        <div className="card" style={styles.summaryCard}>
          <div style={styles.summaryIcon}>📅</div>
          <div style={styles.summaryInfo}>
            <span style={styles.summaryValue}>{formatCurrency(summary.weeklyWages)}</span>
            <span style={styles.summaryLabel}>Gasto Semanal em Salários</span>
          </div>
        </div>

        <div className="card" style={styles.summaryCard}>
          <div style={styles.summaryIcon}>👥</div>
          <div style={styles.summaryInfo}>
            <span style={styles.summaryValue}>{formatCurrency(summary.averageWage)}</span>
            <span style={styles.summaryLabel}>Salário Médio ({summary.squadSize} jogadores)</span>
          </div>
        </div>
      </div>

      {/* Sponsor Info */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={styles.sectionTitle}>🤝 Patrocinador Master</h3>
          {playerClub.sponsor ? (
            <div>
              <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>{playerClub.sponsor.name}</div>
              <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "2px" }}>
                Rendimento Mensal: <span style={{ color: "#10b981", fontWeight: 700 }}>{formatCurrency(playerClub.sponsor.monthlyValue)}</span>
              </div>
              <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                Bônus por Título: <span style={{ color: "var(--color-accent-primary)", fontWeight: 700 }}>{formatCurrency(playerClub.sponsor.titleBonus)}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Nenhum patrocinador ativo (Receita padrão).</div>
          )}
        </div>
        <div style={{ fontSize: "48px", opacity: 0.1 }}>🏢</div>
      </div>

      {/* Wage Usage Bar */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
        <h3 style={styles.sectionTitle}>📈 Utilização da Folha Salarial</h3>
        <div style={styles.wageBarContainer}>
          <div style={{
            ...styles.wageBar,
            width: `${Math.min(summary.wageUsagePercent, 100)}%`,
            background: wageColor,
          }} />
        </div>
        <div style={styles.wageBarLabels}>
          <span>{formatCurrency(summary.totalWages)}</span>
          <span style={{ color: "var(--color-text-muted)" }}>
            Limite: {formatCurrency(summary.wageBudget)}
          </span>
        </div>
        {summary.wageUsagePercent > 100 && (
          <div style={styles.warningBanner}>
            ⚠️ Folha salarial EXCEDIDA! Reduza salários ou venda jogadores.
          </div>
        )}
      </div>

      {/* Highlights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={styles.sectionTitle}>🤑 Maior Salário</h3>
          {summary.highestPaid && (
            <div style={styles.highlightRow}>
              <span style={{ fontSize: "16px", fontWeight: 700 }}>{summary.highestPaid.name}</span>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#ef4444" }}>
                {formatCurrency(summary.highestPaid.wage)}/mês
              </span>
            </div>
          )}
        </div>
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={styles.sectionTitle}>💚 Menor Salário</h3>
          {summary.lowestPaid && (
            <div style={styles.highlightRow}>
              <span style={{ fontSize: "16px", fontWeight: 700 }}>{summary.lowestPaid.name}</span>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#10b981" }}>
                {formatCurrency(summary.lowestPaid.wage)}/mês
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Wage Table */}
      <div className="card" style={{ padding: "20px" }}>
        <h3 style={styles.sectionTitle}>📋 Folha Salarial Completa</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>Jogador</th>
              <th style={{ width: 60 }}>Posição</th>
              <th style={{ width: 50 }}>CA</th>
              <th style={{ width: 50 }}>Idade</th>
              <th style={{ width: 120 }}>Salário/Mês</th>
              <th style={{ width: 120 }}>Valor de Mercado</th>
              <th style={{ width: 100 }}>Custo/Benefício</th>
            </tr>
          </thead>
          <tbody>
            {sortedByWage.map((player, i) => {
              const ratio = player.wage > 0 ? (player.currentAbility / (player.wage / 10000)).toFixed(1) : "—";
              const ratioNum = player.wage > 0 ? player.currentAbility / (player.wage / 10000) : 0;
              const ratioColor = ratioNum > 5 ? "#10b981" : ratioNum > 2 ? "#f59e0b" : "#ef4444";

              return (
                <tr key={player.id}>
                  <td style={{ color: "var(--color-text-muted)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{player.name}</td>
                  <td>
                    <span style={{
                      padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
                      background: "var(--color-bg-secondary)",
                    }}>
                      {player.position}
                    </span>
                  </td>
                  <td style={{
                    fontWeight: 700,
                    color: player.currentAbility >= 70 ? "#10b981" : player.currentAbility >= 55 ? "#f59e0b" : "#ef4444",
                  }}>
                    {player.currentAbility}
                  </td>
                  <td>{player.age}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(player.wage)}</td>
                  <td style={{ color: "var(--color-text-secondary)" }}>{formatCurrency(player.marketValue)}</td>
                  <td style={{ fontWeight: 700, color: ratioColor }}>{ratio}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Total */}
        <div style={styles.totalRow}>
          <span>Total Mensal:</span>
          <span style={{ fontWeight: 900, fontSize: "18px" }}>{formatCurrency(summary.totalWages)}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflow: "auto" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px",
  },
  title: { fontSize: "24px", fontWeight: 800 },
  budgetBadge: {
    fontSize: "16px", fontWeight: 600, padding: "8px 20px",
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "10px",
  },
  summaryGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "16px",
  },
  summaryCard: {
    padding: "20px", display: "flex", alignItems: "center", gap: "14px",
  },
  summaryIcon: { fontSize: "32px" },
  summaryInfo: { display: "flex", flexDirection: "column", gap: "4px" },
  summaryValue: { fontSize: "22px", fontWeight: 900, color: "var(--color-accent-primary)" },
  summaryLabel: { fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" },
  sectionTitle: { fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "var(--color-text-secondary)" },
  wageBarContainer: {
    width: "100%", height: "14px", background: "var(--color-bg-secondary)",
    borderRadius: "7px", overflow: "hidden",
  },
  wageBar: {
    height: "100%", borderRadius: "7px", transition: "width 0.5s ease",
  },
  wageBarLabels: {
    display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "8px",
    fontWeight: 600,
  },
  warningBanner: {
    marginTop: "10px", padding: "10px", borderRadius: "8px",
    background: "rgba(239,68,68,0.12)", color: "#ef4444",
    fontSize: "13px", fontWeight: 600, textAlign: "center",
  },
  highlightRow: {
    display: "flex", flexDirection: "column", gap: "6px", alignItems: "center",
    padding: "12px 0",
  },
  totalRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 0 0", marginTop: "12px",
    borderTop: "1px solid var(--color-border)", fontSize: "14px", fontWeight: 700,
  },
};
