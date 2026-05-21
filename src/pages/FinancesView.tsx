import { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { calculateFinancialSummary, formatCurrency } from "../engine/financeEngine";

type Tab = "overview" | "ledger" | "wages";

export default function FinancesView() {
  const { playerClub, playerSquad, budget, debt, payOffDebt, financialLedger, upgradeInfrastructure, sponsorOffers, searchSponsors, acceptSponsor } = useGame();
  const [tab, setTab] = useState<Tab>("overview");
  const [upgradeMsg, setUpgradeMsg] = useState("");

  const summary = calculateFinancialSummary(playerSquad, playerClub, budget);

  const wageColor =
    summary.wageUsagePercent > 100 ? "#ef4444" :
    summary.wageUsagePercent > 80 ? "#f59e0b" : "#10b981";

  // Financial ledger aggregation
  const { totalIncome, totalExpense, balance, recentEntries, monthlyData } = useMemo(() => {
    const inc = financialLedger.filter(r => r.type === "income").reduce((s, r) => s + r.amount, 0);
    const exp = financialLedger.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0);
    const recent = [...financialLedger].reverse().slice(0, 30);

    // Aggregate by month
    const byMonth = new Map<number, { income: number; expense: number }>();
    for (const r of financialLedger) {
      const key = r.month;
      const cur = byMonth.get(key) || { income: 0, expense: 0 };
      if (r.type === "income") cur.income += r.amount;
      else cur.expense += r.amount;
      byMonth.set(key, cur);
    }

    const months = Array.from(byMonth.entries()).sort((a, b) => a[0] - b[0]);

    return { totalIncome: inc, totalExpense: exp, balance: inc - exp, recentEntries: recent, monthlyData: months };
  }, [financialLedger]);

  const handleUpgrade = () => {
    const ok = upgradeInfrastructure();
    setUpgradeMsg(ok ? "✅ Infraestrutura melhorada!" : "❌ Saldo insuficiente (R$ 2M) ou já no máximo");
    setTimeout(() => setUpgradeMsg(""), 3000);
  };

  const sortedByWage = [...playerSquad].sort((a, b) => b.wage - a.wage);
  const MONTH_NAMES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

      {/* Tabs */}
      <div style={styles.tabBar}>
        {(["overview", "ledger", "wages"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...styles.tab,
            ...(tab === t ? styles.tabActive : {}),
          }}>
            {t === "overview" ? "📊 Visão Geral" : t === "ledger" ? "📋 Extrato" : "💼 Folha Salarial"}
          </button>
        ))}
      </div>

      {/* ============= TAB: OVERVIEW ============= */}
      {tab === "overview" && (
        <>
          {/* Flow Cards */}
          <div style={styles.flowGrid}>
            <div className="card" style={{ ...styles.flowCard, borderLeft: "4px solid #10b981" }}>
              <div style={styles.flowLabel}>📈 Receita Total</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#10b981" }}>{formatCurrency(totalIncome)}</div>
            </div>
            <div className="card" style={{ ...styles.flowCard, borderLeft: "4px solid #ef4444" }}>
              <div style={styles.flowLabel}>📉 Despesas Total</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#ef4444" }}>{formatCurrency(totalExpense)}</div>
            </div>
            <div className="card" style={{ ...styles.flowCard, borderLeft: `4px solid ${balance >= 0 ? "#10b981" : "#ef4444"}` }}>
              <div style={styles.flowLabel}>💰 Balanço</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: balance >= 0 ? "#10b981" : "#ef4444" }}>
                {balance >= 0 ? "+" : ""}{formatCurrency(Math.abs(balance))}
              </div>
            </div>
            <div className="card" style={{ ...styles.flowCard, borderLeft: `4px solid ${debt > 0 ? "#ef4444" : "#10b981"}` }}>
              <div style={styles.flowLabel}>🏦 Dívidas / Empréstimos</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: debt > 0 ? "#ef4444" : "#10b981" }}>
                {formatCurrency(debt)}
              </div>
            </div>
          </div>

          {/* Debt Management Section */}
          <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
            <h3 style={styles.sectionTitle}>🏦 Gestão de Empréstimos e Amortização</h3>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  O clube paga mensalmente impostos e encargos de empréstimos automáticos caso o saldo fique negativo.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                  <div>🏛️ Impostos Mensais: <span style={{ fontWeight: 700 }}>R$ 20.000</span></div>
                  <div>📈 Taxa de Juros: <span style={{ fontWeight: 700 }}>1.5% ao mês</span></div>
                  <div>📉 Amortização Mínima: <span style={{ fontWeight: 700 }}>R$ 10.000/mês</span></div>
                  <div>💰 Status: <span style={{ fontWeight: 700, color: debt > 0 ? "#ef4444" : "#10b981" }}>{debt > 0 ? "Com Dívida Ativa" : "Sem Dívidas"}</span></div>
                </div>
              </div>
              
              {debt > 0 ? (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button 
                    className="btn-secondary" 
                    onClick={() => payOffDebt(50000)}
                    disabled={budget < 50000}
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                  >
                    💸 Amortizar R$ 50k
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => payOffDebt(100000)}
                    disabled={budget < 100000}
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                  >
                    💸 Amortizar R$ 100k
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => payOffDebt(debt)}
                    disabled={budget < debt}
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                  >
                    Quitar Dívida ({formatCurrency(debt)})
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: "12px 20px", background: "rgba(16,185,129,0.1)", borderRadius: "8px",
                  color: "#10b981", fontWeight: 700, fontSize: "14px"
                }}>
                  🏆 Excelente! O clube está com as finanças limpas e sem dívidas ativas.
                </div>
              )}
            </div>
          </div>

          {/* Mini chart — bar chart of income vs expense by month */}
          {monthlyData.length > 0 && (
            <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
              <h3 style={styles.sectionTitle}>📊 Fluxo Mensal</h3>
              <div style={styles.chartContainer}>
                {monthlyData.map(([month, data]) => {
                  const maxVal = Math.max(...monthlyData.map(([, d]) => Math.max(d.income, d.expense)), 1);
                  const incH = Math.max(4, (data.income / maxVal) * 100);
                  const expH = Math.max(4, (data.expense / maxVal) * 100);
                  return (
                    <div key={month} style={styles.chartColumn}>
                      <div style={styles.chartBars}>
                        <div style={{ ...styles.chartBar, height: `${incH}%`, background: "#10b981" }}
                          title={`Receita: ${formatCurrency(data.income)}`} />
                        <div style={{ ...styles.chartBar, height: `${expH}%`, background: "#ef4444" }}
                          title={`Despesa: ${formatCurrency(data.expense)}`} />
                      </div>
                      <span style={styles.chartLabel}>{MONTH_NAMES[month] || month}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "12px", fontSize: "12px" }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 4 }} />Receita</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ef4444", borderRadius: 2, marginRight: 4 }} />Despesa</span>
              </div>
            </div>
          )}

          {/* Sponsor */}
          <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={styles.sectionTitle}>🤝 Patrocinador Master</h3>
                {playerClub.sponsor ? (
                  <div>
                    <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>{playerClub.sponsor.name}</div>
                    <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "2px" }}>
                      Mensal: <span style={{ color: "#10b981", fontWeight: 700 }}>{formatCurrency(playerClub.sponsor.monthlyValue)}</span>
                    </div>
                    <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                      Bônus Título: <span style={{ color: "var(--color-accent-primary)", fontWeight: 700 }}>{formatCurrency(playerClub.sponsor.titleBonus)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Nenhum patrocinador ativo.</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "48px", opacity: 0.1, marginBottom: "8px" }}>🏢</div>
                {(!sponsorOffers || sponsorOffers.length === 0) && (
                  <button className="btn-secondary" onClick={searchSponsors} style={{ fontSize: "13px" }}>
                    🔍 Buscar Patrocinadores
                  </button>
                )}
              </div>
            </div>

            {sponsorOffers && sponsorOffers.length > 0 && (
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "var(--color-text)" }}>Ofertas Disponíveis</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {sponsorOffers.map((offer, i) => (
                    <div key={i} style={{ 
                      display: "flex", justifyContent: "space-between", alignItems: "center", 
                      padding: "12px", background: "var(--color-bg-secondary)", borderRadius: "8px" 
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "15px" }}>{offer.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                          Mensal: <span style={{ color: "#10b981", fontWeight: 700 }}>{formatCurrency(offer.monthlyValue)}</span> • 
                          Bônus: <span style={{ color: "var(--color-accent-primary)", fontWeight: 700 }}>{formatCurrency(offer.titleBonus)}</span>
                        </div>
                      </div>
                      <button className="btn-primary" onClick={() => acceptSponsor(offer)} style={{ fontSize: "12px", padding: "6px 12px" }}>
                        ✍️ Assinar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Infrastructure Upgrade */}
          <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
            <h3 style={styles.sectionTitle}>🏗️ Infraestrutura do Clube</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
              <div style={{
                fontSize: "40px", fontWeight: 900, color: "var(--color-accent-primary)",
              }}>
                {playerClub.infrastructure}
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.infraBarOuter}>
                  <div style={{ ...styles.infraBarInner, width: `${playerClub.infrastructure}%` }} />
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  Impacta: Treino • Bilheteria • Jovens da Base
                </div>
              </div>
              <button className="btn-primary" onClick={handleUpgrade} style={{ whiteSpace: "nowrap", fontSize: "13px" }}>
                ⬆️ Upgrade (R$ 2M)
              </button>
            </div>
            {upgradeMsg && (
              <div style={{
                padding: "8px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textAlign: "center",
                background: upgradeMsg.startsWith("✅") ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                color: upgradeMsg.startsWith("✅") ? "#10b981" : "#ef4444",
              }}>
                {upgradeMsg}
              </div>
            )}
          </div>

          {/* Wage overview */}
          <div className="card" style={{ padding: "20px" }}>
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
              <span style={{ color: "var(--color-text-muted)" }}>Limite: {formatCurrency(summary.wageBudget)}</span>
            </div>
          </div>
        </>
      )}

      {/* ============= TAB: LEDGER ============= */}
      {tab === "ledger" && (
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={styles.sectionTitle}>📋 Extrato Financeiro</h3>
          {recentEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
              Nenhuma transação registrada. Avance rodadas para gerar receitas e despesas.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Mês</th>
                  <th>Descrição</th>
                  <th style={{ width: 80 }}>Tipo</th>
                  <th style={{ width: 120 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--color-text-muted)" }}>{MONTH_NAMES[entry.month] || entry.month}</td>
                    <td>{entry.description}</td>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
                        background: entry.type === "income" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: entry.type === "income" ? "#10b981" : "#ef4444",
                      }}>
                        {entry.type === "income" ? "RECEITA" : "DESPESA"}
                      </span>
                    </td>
                    <td style={{
                      fontWeight: 700,
                      color: entry.type === "income" ? "#10b981" : "#ef4444",
                    }}>
                      {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============= TAB: WAGES ============= */}
      {tab === "wages" && (
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div style={styles.highlightBox}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>🤑 Maior Salário</div>
              {summary.highestPaid && (
                <>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>{summary.highestPaid.name}</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#ef4444" }}>{formatCurrency(summary.highestPaid.wage)}/mês</div>
                </>
              )}
            </div>
            <div style={styles.highlightBox}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>💚 Menor Salário</div>
              {summary.lowestPaid && (
                <>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>{summary.lowestPaid.name}</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#10b981" }}>{formatCurrency(summary.lowestPaid.wage)}/mês</div>
                </>
              )}
            </div>
          </div>

          <h3 style={styles.sectionTitle}>📋 Folha Salarial Completa</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Jogador</th>
                <th style={{ width: 60 }}>Pos</th>
                <th style={{ width: 50 }}>CA</th>
                <th style={{ width: 50 }}>Idade</th>
                <th style={{ width: 120 }}>Salário/Mês</th>
                <th style={{ width: 120 }}>Valor Mercado</th>
              </tr>
            </thead>
            <tbody>
              {sortedByWage.map((player, i) => (
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
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.totalRow}>
            <span>Total Mensal:</span>
            <span style={{ fontWeight: 900, fontSize: "18px" }}>{formatCurrency(summary.totalWages)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflow: "auto" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px",
  },
  title: { fontSize: "24px", fontWeight: 800 },
  budgetBadge: {
    fontSize: "16px", fontWeight: 600, padding: "8px 20px",
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    borderRadius: "10px",
  },
  tabBar: {
    display: "flex", gap: "8px", marginBottom: "20px",
  },
  tab: {
    padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    cursor: "pointer", color: "var(--color-text-secondary)", transition: "all 0.2s",
  },
  tabActive: {
    background: "var(--color-accent-primary)", color: "#fff", border: "1px solid transparent",
  },
  flowGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px",
  },
  flowCard: { padding: "20px" },
  flowLabel: { fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase" as const },
  sectionTitle: { fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "var(--color-text-secondary)" },
  chartContainer: {
    display: "flex", alignItems: "flex-end", gap: "8px", height: "120px",
    padding: "0 8px",
  },
  chartColumn: {
    flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "4px", height: "100%",
  },
  chartBars: {
    flex: 1, display: "flex", gap: "3px", alignItems: "flex-end", width: "100%",
  },
  chartBar: {
    flex: 1, borderRadius: "3px 3px 0 0", minHeight: "4px", transition: "height 0.3s",
  },
  chartLabel: { fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 600 },
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
  infraBarOuter: {
    width: "100%", height: "10px", background: "var(--color-bg-secondary)",
    borderRadius: "5px", overflow: "hidden",
  },
  infraBarInner: {
    height: "100%", background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
    borderRadius: "5px", transition: "width 0.4s",
  },
  highlightBox: {
    padding: "16px", background: "var(--color-bg-secondary)", borderRadius: "10px",
    display: "flex", flexDirection: "column" as const, gap: "4px", alignItems: "center",
  },
  totalRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 0 0", marginTop: "12px",
    borderTop: "1px solid var(--color-border)", fontSize: "14px", fontWeight: 700,
  },
};
