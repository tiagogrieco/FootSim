import { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";
import type { TransferListing, TransferOffer } from "../engine/transferEngine";

type Tab = "market" | "offers" | "sell";
type FilterPos = "ALL" | "GK" | "DEF" | "MID" | "FWD";

function formatCurrency(val: number): string {
  if (val === 0) return "Grátis";
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val}`;
}

function getBadgeColor(cat: string): string {
  if (cat === "GK") return "#f59e0b";
  if (cat === "DEF") return "#3b82f6";
  if (cat === "MID") return "#10b981";
  return "#ef4444";
}

export default function TransferView() {
  const {
    transferMarket, incomingOffers, budget, playerSquad,
    makeOffer, respondToOffer, refreshTransferMarket,
  } = useGame();

  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [filterPos, setFilterPos] = useState<FilterPos>("ALL");
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [lastResult, setLastResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const filteredMarket = useMemo(() => {
    if (filterPos === "ALL") return transferMarket;
    return transferMarket.filter(l => l.player.positionCategory === filterPos);
  }, [transferMarket, filterPos]);

  const pendingOffers = incomingOffers.filter(o => o.status === "pending");
  const resolvedOffers = incomingOffers.filter(o => o.status !== "pending");

  const handleMakeOffer = (index: number) => {
    const amount = parseInt(offerAmount.replace(/\D/g, "")) || 0;
    const listing = transferMarket[index];

    if (listing.askingPrice === 0) {
      // Free agent
      const result = makeOffer(index, 0);
      if (result === "accepted") {
        setLastResult({ type: "success", msg: `${listing.player.name} assinou como agente livre!` });
        setSelectedListing(null);
      }
      return;
    }

    if (amount <= 0) {
      setLastResult({ type: "error", msg: "Digite um valor válido" });
      return;
    }

    if (amount > budget) {
      setLastResult({ type: "error", msg: "Orçamento insuficiente!" });
      return;
    }

    const result = makeOffer(index, amount);
    if (result === "accepted") {
      setLastResult({ type: "success", msg: `✅ Proposta aceita! ${listing.player.name} é seu!` });
      setSelectedListing(null);
      setOfferAmount("");
    } else {
      setLastResult({ type: "error", msg: `❌ Proposta recusada por ${listing.sellerClubName}` });
    }

    setTimeout(() => setLastResult(null), 4000);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔄 Mercado de Transferências</h1>
        <div style={styles.headerRight}>
          <div style={styles.budgetBox}>
            <span style={styles.budgetLabel}>Orçamento</span>
            <span style={styles.budgetValue}>{formatCurrency(budget)}</span>
          </div>
          <button className="btn-secondary" onClick={refreshTransferMarket}>
            🔄 Atualizar Mercado
          </button>
        </div>
      </div>

      {/* Notification */}
      {lastResult && (
        <div style={{
          ...styles.notification,
          background: lastResult.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          borderColor: lastResult.type === "success" ? "#10b981" : "#ef4444",
        }}>
          {lastResult.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {([
          { key: "market" as Tab, label: "Mercado", icon: "🏪", count: transferMarket.length },
          { key: "offers" as Tab, label: "Propostas Recebidas", icon: "📨", count: pendingOffers.length },
          { key: "sell" as Tab, label: "Meu Elenco", icon: "💰", count: playerSquad.length },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.icon} {tab.label}
            {tab.count > 0 && (
              <span style={{
                ...styles.tabBadge,
                background: tab.key === "offers" && pendingOffers.length > 0 ? "#ef4444" : "var(--color-bg-hover)",
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Market Tab */}
      {activeTab === "market" && (
        <div style={styles.content}>
          {/* Filters */}
          <div style={styles.filterBar}>
            {(["ALL", "GK", "DEF", "MID", "FWD"] as FilterPos[]).map(f => (
              <button
                key={f}
                onClick={() => setFilterPos(f)}
                style={{
                  ...styles.filterBtn,
                  ...(filterPos === f ? styles.filterBtnActive : {}),
                }}
              >
                {f === "ALL" ? "Todos" : f}
              </button>
            ))}
            <span style={styles.resultCount}>{filteredMarket.length} disponíveis</span>
          </div>

          <div style={styles.marketGrid}>
            {/* Player list */}
            <div style={styles.listPanel}>
              {filteredMarket.map((listing, index) => (
                <div
                  key={listing.player.id}
                  onClick={() => { setSelectedListing(index); setOfferAmount(String(listing.askingPrice)); }}
                  style={{
                    ...styles.listItem,
                    ...(selectedListing === index ? styles.listItemActive : {}),
                  }}
                >
                  <span style={{
                    ...styles.posBadge,
                    background: getBadgeColor(listing.player.positionCategory),
                  }}>{listing.player.position}</span>
                  <div style={styles.listInfo}>
                    <span style={{ fontWeight: 600, fontSize: "13px" }}>{listing.player.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {listing.player.age} anos • {listing.sellerClubName}
                    </span>
                  </div>
                  <span style={{
                    fontWeight: 800, fontSize: "14px",
                    color: getAttrColor(listing.player.currentAbility),
                  }}>{listing.player.currentAbility}</span>
                  <span style={{
                    fontWeight: 600, fontSize: "12px",
                    color: listing.askingPrice === 0 ? "#10b981" : "var(--color-accent-secondary)",
                    minWidth: "80px", textAlign: "right",
                  }}>{formatCurrency(listing.askingPrice)}</span>
                </div>
              ))}
            </div>

            {/* Detail panel */}
            {selectedListing !== null && filteredMarket[selectedListing] && (
              <div className="card" style={styles.detailPanel}>
                <PlayerCard
                  listing={filteredMarket[selectedListing]}
                  offerAmount={offerAmount}
                  onOfferChange={setOfferAmount}
                  onMakeOffer={() => handleMakeOffer(selectedListing)}
                  budget={budget}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === "offers" && (
        <div style={styles.offersContainer}>
          {pendingOffers.length === 0 && resolvedOffers.length === 0 ? (
            <div className="card" style={{ padding: "60px", textAlign: "center" }}>
              <p style={{ fontSize: "16px", color: "var(--color-text-muted)" }}>📭 Nenhuma proposta recebida</p>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "8px" }}>
                Propostas aparecem à medida que você avança rodadas
              </p>
            </div>
          ) : (
            <>
              {pendingOffers.length > 0 && (
                <div>
                  <h3 style={styles.sectionTitle}>⏳ Pendentes</h3>
                  {pendingOffers.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onRespond={respondToOffer} />
                  ))}
                </div>
              )}
              {resolvedOffers.length > 0 && (
                <div>
                  <h3 style={styles.sectionTitle}>📋 Histórico</h3>
                  {resolvedOffers.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onRespond={respondToOffer} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sell Tab */}
      {activeTab === "sell" && (
        <div style={styles.sellContainer}>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
            💡 Propostas por seus jogadores aparecem automaticamente ao longo da temporada.
          </p>
          <div className="card" style={{ padding: "0" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Nome</th>
                  <th style={{ width: 50 }}>Pos</th>
                  <th style={{ width: 40 }}>CA</th>
                  <th style={{ width: 40 }}>PA</th>
                  <th style={{ width: 50 }}>Idade</th>
                  <th style={{ width: 100 }}>Valor Est.</th>
                </tr>
              </thead>
              <tbody>
                {[...playerSquad].sort((a, b) => b.currentAbility - a.currentAbility).map(p => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--color-text-muted)" }}>{p.shirtNumber}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <span style={{ ...styles.posBadge, background: getBadgeColor(p.positionCategory), fontSize: "10px", padding: "2px 6px" }}>
                        {p.position}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: getAttrColor(p.currentAbility) }}>{p.currentAbility}</td>
                    <td style={{ fontWeight: 700, color: getAttrColor(p.potentialAbility) }}>{p.potentialAbility}</td>
                    <td>{p.age}</td>
                    <td style={{ color: "var(--color-accent-secondary)", fontWeight: 500 }}>{formatCurrency(p.marketValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ listing, offerAmount, onOfferChange, onMakeOffer, budget }: {
  listing: TransferListing;
  offerAmount: string;
  onOfferChange: (v: string) => void;
  onMakeOffer: () => void;
  budget: number;
}) {
  const p = listing.player;
  const attrs = [
    { label: "VEL", key: "pace" as const },
    { label: "FIN", key: "shooting" as const },
    { label: "PAS", key: "passing" as const },
    { label: "DRI", key: "dribbling" as const },
    { label: "DEF", key: "defending" as const },
    { label: "FIS", key: "physical" as const },
    { label: "GOL", key: "goalkeeping" as const },
  ];

  return (
    <div style={styles.cardContent}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 800 }}>{p.name}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
            <span style={{ ...styles.posBadge, background: getBadgeColor(p.positionCategory) }}>{p.position}</span>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              {p.age} anos • {p.nationality}
            </span>
          </div>
        </div>
        <div style={styles.caDisplay}>
          <span style={{ fontSize: "32px", fontWeight: 900, color: getAttrColor(p.currentAbility) }}>
            {p.currentAbility}
          </span>
          <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>CA</span>
        </div>
      </div>

      {/* Attributes */}
      <div style={styles.attrsRow}>
        {attrs.map(a => (
          <div key={a.key} style={styles.attrBox}>
            <span style={{ fontSize: "18px", fontWeight: 800, color: getAttrColor(p.attributes[a.key]) }}>
              {p.attributes[a.key]}
            </span>
            <span style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>{a.label}</span>
          </div>
        ))}
      </div>

      {/* Deal info */}
      <div style={styles.dealInfo}>
        <div style={styles.dealRow}>
          <span>Clube Vendedor</span>
          <span style={{ fontWeight: 600 }}>{listing.sellerClubName}</span>
        </div>
        <div style={styles.dealRow}>
          <span>Valor Pedido</span>
          <span style={{ fontWeight: 700, color: listing.askingPrice === 0 ? "#10b981" : "var(--color-accent-secondary)" }}>
            {formatCurrency(listing.askingPrice)}
          </span>
        </div>
        <div style={styles.dealRow}>
          <span>Negociável</span>
          <span>{listing.negotiable ? "✅ Sim" : "❌ Não"}</span>
        </div>
        <div style={styles.dealRow}>
          <span>Dias no Mercado</span>
          <span>{listing.daysOnMarket}d</span>
        </div>
      </div>

      {/* Offer section */}
      <div style={styles.offerSection}>
        {listing.askingPrice === 0 ? (
          <button className="btn-primary" onClick={onMakeOffer} style={{ width: "100%" }}>
            ✍️ Assinar Agente Livre
          </button>
        ) : (
          <>
            <div style={styles.offerInputRow}>
              <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>R$</span>
              <input
                type="text"
                value={offerAmount}
                onChange={e => onOfferChange(e.target.value.replace(/\D/g, ""))}
                placeholder="Valor da proposta"
                style={styles.offerInput}
              />
            </div>
            <button
              className="btn-primary"
              onClick={onMakeOffer}
              disabled={parseInt(offerAmount) > budget}
              style={{ width: "100%" }}
            >
              💰 Fazer Proposta
            </button>
            {parseInt(offerAmount) > budget && (
              <span style={{ fontSize: "11px", color: "#ef4444" }}>Orçamento insuficiente</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OfferCard({ offer, onRespond }: {
  offer: TransferOffer;
  onRespond: (id: number, accept: boolean) => void;
}) {
  return (
    <div className="card" style={styles.offerCard}>
      <div style={styles.offerInfo}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{offer.player.name}</span>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", marginLeft: "8px" }}>
            {offer.player.position} • CA {offer.player.currentAbility}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          Proposta de <strong>{offer.fromClubName}</strong>
          {offer.reason && (
            <span style={{ display: "block", fontSize: "10px", color: "var(--color-accent-secondary)", fontStyle: "italic", marginTop: "2px" }}>
              📋 {offer.reason}
            </span>
          )}
        </div>
      </div>
      <div style={styles.offerAmount}>
        {formatCurrency(offer.offerAmount)}
      </div>
      {offer.status === "pending" ? (
        <div style={styles.offerActions}>
          <button
            className="btn-primary"
            onClick={() => onRespond(offer.id, true)}
            style={{ fontSize: "12px", padding: "6px 16px" }}
          >
            ✅ Aceitar
          </button>
          <button
            className="btn-secondary"
            onClick={() => onRespond(offer.id, false)}
            style={{ fontSize: "12px", padding: "6px 16px" }}
          >
            ❌ Recusar
          </button>
        </div>
      ) : (
        <span style={{
          fontSize: "12px", fontWeight: 700,
          color: offer.status === "accepted" ? "#10b981" : "#ef4444",
        }}>
          {offer.status === "accepted" ? "ACEITA" : "RECUSADA"}
        </span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 },
  title: { fontSize: "24px", fontWeight: 800 },
  headerRight: { display: "flex", alignItems: "center", gap: "16px" },
  budgetBox: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  budgetLabel: { fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" },
  budgetValue: { fontSize: "18px", fontWeight: 900, color: "#10b981" },

  notification: {
    padding: "10px 16px", borderRadius: "8px", border: "1px solid",
    fontSize: "13px", fontWeight: 600, marginBottom: "12px", flexShrink: 0,
  },

  tabs: { display: "flex", gap: "8px", marginBottom: "16px", flexShrink: 0 },
  tab: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 600,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "var(--color-accent-primary)", borderColor: "var(--color-accent-primary)", color: "#fff",
  },
  tabBadge: {
    fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "10px",
    color: "#fff", minWidth: "18px", textAlign: "center",
  },

  content: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  filterBar: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", flexShrink: 0 },
  filterBtn: {
    padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 600,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
  },
  filterBtnActive: {
    background: "var(--color-accent-primary)", borderColor: "var(--color-accent-primary)", color: "#fff",
  },
  resultCount: { marginLeft: "auto", fontSize: "12px", color: "var(--color-text-muted)" },

  marketGrid: { flex: 1, display: "flex", gap: "16px", overflow: "hidden" },
  listPanel: { flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "4px" },
  listItem: {
    display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px",
    borderRadius: "6px", cursor: "pointer", transition: "background 0.15s",
    background: "var(--color-bg-card)", border: "1px solid transparent",
  },
  listItemActive: {
    background: "var(--color-bg-active)", borderColor: "var(--color-accent-primary)",
  },
  listInfo: { flex: 1, display: "flex", flexDirection: "column", gap: "1px" },

  posBadge: {
    fontSize: "10px", fontWeight: 800, color: "#fff", padding: "3px 8px",
    borderRadius: "4px", textTransform: "uppercase", flexShrink: 0,
  },

  detailPanel: { width: "340px", flexShrink: 0, padding: "20px", overflow: "auto" },
  cardContent: { display: "flex", flexDirection: "column", gap: "16px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  caDisplay: { display: "flex", flexDirection: "column", alignItems: "center" },
  attrsRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" },
  attrBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
    padding: "8px 2px", background: "var(--color-bg-hover)", borderRadius: "6px",
  },
  dealInfo: { display: "flex", flexDirection: "column", gap: "6px" },
  dealRow: {
    display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-secondary)",
    padding: "4px 0", borderBottom: "1px solid var(--color-border)",
  },
  offerSection: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" },
  offerInputRow: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "var(--color-bg-hover)", borderRadius: "6px", padding: "8px 12px",
    border: "1px solid var(--color-border)",
  },
  offerInput: {
    flex: 1, background: "none", border: "none", color: "var(--color-text-primary)",
    fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-sans)", outline: "none",
  },

  offersContainer: { flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "16px" },
  sectionTitle: { fontSize: "14px", fontWeight: 700, marginBottom: "10px", color: "var(--color-text-secondary)" },
  offerCard: {
    padding: "14px 18px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "6px",
  },
  offerInfo: { flex: 1 },
  offerAmount: { fontSize: "16px", fontWeight: 800, color: "#10b981", minWidth: "100px", textAlign: "right" },
  offerActions: { display: "flex", gap: "8px" },

  sellContainer: { flex: 1, overflow: "auto" },
};
