import { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";
import { calculateMarketValue, type TransferOffer } from "../engine/transferEngine";

type Tab = "market" | "offers" | "sell";
type FilterPos = "ALL" | "GK" | "DEF" | "MID" | "FWD";

function fmt(val: number): string {
  if (val === 0) return "Grátis";
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val}`;
}

function posBg(cat: string) {
  return cat === "GK" ? "#f59e0b" : cat === "DEF" ? "#3b82f6" : cat === "MID" ? "#10b981" : "#ef4444";
}

export default function TransferView() {
  const {
    transferMarket, incomingOffers, budget, playerSquad,
    makeOffer, respondToOffer,
    listedForSale, listForSale, unlistForSale,
    isTransferBlocked,
  } = useGame();

  const [tab, setTab] = useState<Tab>("market");
  const [filterPos, setFilterPos] = useState<FilterPos>("ALL");
  const [search, setSearch] = useState("");
  const [maxAge, setMaxAge] = useState<number>(40);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [sel, setSel] = useState<number | null>(null);
  const [offerAmt, setOfferAmt] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    let list = transferMarket;
    if (filterPos !== "ALL") list = list.filter(l => l.player.positionCategory === filterPos);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.player.name.toLowerCase().includes(q) || l.sellerClubName.toLowerCase().includes(q));
    }
    if (maxAge < 40) list = list.filter(l => l.player.age <= maxAge);
    if (maxPrice > 0) list = list.filter(l => l.askingPrice <= maxPrice);
    return list;
  }, [transferMarket, filterPos, search, maxAge, maxPrice]);

  const pending = incomingOffers.filter(o => o.status === "pending");
  const resolved = incomingOffers.filter(o => o.status !== "pending");

  const handleBuy = (idx: number) => {
    if (isTransferBlocked) { showToast(false, "🔒 Contratações bloqueadas pela diretoria!"); return; }
    const listing = filtered[idx];
    if (!listing) return;

    // Find real index in transferMarket
    const realIdx = transferMarket.indexOf(listing);
    if (realIdx < 0) return;

    if (listing.askingPrice === 0) {
      const r = makeOffer(realIdx, 0);
      if (r === "accepted") { showToast(true, `${listing.player.name} assinou!`); setSel(null); }
      return;
    }

    const amount = parseInt(offerAmt.replace(/\D/g, "")) || 0;
    if (amount <= 0) { showToast(false, "Digite um valor"); return; }
    if (amount > budget) { showToast(false, "Sem orçamento!"); return; }

    const r = makeOffer(realIdx, amount);
    if (r === "accepted") {
      showToast(true, `✅ ${listing.player.name} é seu!`);
      setSel(null); setOfferAmt("");
    } else if (r === "counter") {
      // listing.askingPrice was updated by makeOffer
      showToast(false, `🤝 Contra-proposta: ${fmt(transferMarket[realIdx].askingPrice)}`);
      setOfferAmt(String(transferMarket[realIdx].askingPrice));
    } else {
      showToast(false, `❌ Recusada por ${listing.sellerClubName}`);
    }
  };

  const p = sel !== null && filtered[sel] ? filtered[sel].player : null;
  const listing = sel !== null ? filtered[sel] : null;

  return (
    <div style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>🔄 Mercado de Transferências</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Orçamento</div>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "#10b981" }}>{fmt(budget)}</div>
          </div>
          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>🔄 Mercado atualiza automaticamente</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "12px",
          background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.ok ? "#10b981" : "#ef4444"}`,
        }}>{toast.msg}</div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {([
          { k: "market" as Tab, l: "🏪 Mercado", c: transferMarket.length },
          { k: "offers" as Tab, l: "📨 Propostas", c: pending.length },
          { k: "sell" as Tab, l: "💰 Vender", c: listedForSale.length },
        ]).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            fontFamily: "var(--font-sans)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "6px",
            background: tab === t.k ? "var(--color-accent-primary)" : "var(--color-bg-card)",
            border: `1px solid ${tab === t.k ? "var(--color-accent-primary)" : "var(--color-border)"}`,
            color: tab === t.k ? "#fff" : "var(--color-text-secondary)",
          }}>
            {t.l}
            {t.c > 0 && <span style={{
              fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "10px",
              background: t.k === "offers" && pending.length > 0 ? "#ef4444" : "var(--color-bg-hover)", color: "#fff",
            }}>{t.c}</span>}
          </button>
        ))}
      </div>

      {/* ══════ MARKET TAB ══════ */}
      {tab === "market" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Search + Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text" placeholder="🔍 Buscar jogador ou clube..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "13px",
                background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)", fontFamily: "var(--font-sans)", outline: "none",
              }}
            />
            {(["ALL", "GK", "DEF", "MID", "FWD"] as FilterPos[]).map(f => (
              <button key={f} onClick={() => setFilterPos(f)} style={{
                padding: "5px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                cursor: "pointer", fontFamily: "var(--font-sans)",
                background: filterPos === f ? "var(--color-accent-primary)" : "var(--color-bg-card)",
                border: `1px solid ${filterPos === f ? "var(--color-accent-primary)" : "var(--color-border)"}`,
                color: filterPos === f ? "#fff" : "var(--color-text-secondary)",
              }}>{f === "ALL" ? "Todos" : f}</button>
            ))}
            <select value={maxAge} onChange={e => setMaxAge(Number(e.target.value))} style={{
              padding: "5px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
              background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)", cursor: "pointer",
            }}>
              <option value={40}>Qualquer idade</option>
              <option value={21}>≤21</option>
              <option value={25}>≤25</option>
              <option value={28}>≤28</option>
              <option value={32}>≤32</option>
            </select>
            <select value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{
              padding: "5px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
              background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)", cursor: "pointer",
            }}>
              <option value={0}>Qualquer valor</option>
              <option value={1_000_000}>≤R$ 1M</option>
              <option value={5_000_000}>≤R$ 5M</option>
              <option value={10_000_000}>≤R$ 10M</option>
              <option value={20_000_000}>≤R$ 20M</option>
              <option value={50_000_000}>≤R$ 50M</option>
            </select>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{filtered.length}</span>
          </div>

          <div style={{ flex: 1, display: "flex", gap: "16px", overflow: "hidden" }}>
            {/* List */}
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
              {filtered.map((l, i) => (
                <div key={l.player.id} onClick={() => { setSel(i); setOfferAmt(String(l.askingPrice)); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px",
                    borderRadius: "6px", cursor: "pointer", transition: "background 0.15s",
                    background: sel === i ? "var(--color-bg-active)" : "var(--color-bg-card)",
                    border: sel === i ? "1px solid var(--color-accent-primary)" : "1px solid transparent",
                  }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#fff", padding: "3px 8px", borderRadius: "4px", background: posBg(l.player.positionCategory) }}>{l.player.position}</span>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px" }}>{l.player.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{l.player.age}a • {l.sellerClubName}</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "14px", color: getAttrColor(l.player.currentAbility) }}>{l.player.currentAbility}</span>
                  <span style={{ fontWeight: 600, fontSize: "12px", color: l.askingPrice === 0 ? "#10b981" : "var(--color-accent-secondary)", minWidth: "80px", textAlign: "right" }}>{fmt(l.askingPrice)}</span>
                </div>
              ))}
            </div>

            {/* Detail */}
            {p && listing && (
              <div className="card" style={{ width: "340px", flexShrink: 0, padding: "20px", overflow: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 800 }}>{p.name}</h2>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#fff", padding: "3px 8px", borderRadius: "4px", background: posBg(p.positionCategory) }}>{p.position}</span>
                      <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{p.age}a • {p.nationality}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "32px", fontWeight: 900, color: getAttrColor(p.currentAbility) }}>{p.currentAbility}</span>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>CA</div>
                  </div>
                </div>

                {/* Attrs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "16px" }}>
                  {(["pace", "shooting", "passing", "dribbling", "defending", "physical", "goalkeeping"] as const).map(k => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "8px 2px", background: "var(--color-bg-hover)", borderRadius: "6px" }}>
                      <span style={{ fontSize: "18px", fontWeight: 800, color: getAttrColor(p.attributes[k]) }}>{p.attributes[k]}</span>
                      <span style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>{k.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>

                {/* Deal info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                  {[
                    ["Vendedor", listing.sellerClubName],
                    ["Valor Pedido", fmt(listing.askingPrice)],
                    ["Negociável", listing.negotiable ? "✅ Sim" : "❌ Não"],
                    ["Dias no Mercado", `${listing.daysOnMarket}d`],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-secondary)", padding: "4px 0", borderBottom: "1px solid var(--color-border)" }}>
                      <span>{label}</span><span style={{ fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Offer */}
                {listing.askingPrice === 0 ? (
                  <button className="btn-primary" onClick={() => handleBuy(sel!)} style={{ width: "100%" }}>✍️ Assinar Agente Livre</button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-bg-hover)", borderRadius: "6px", padding: "8px 12px", border: "1px solid var(--color-border)" }}>
                      <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>R$</span>
                      <input type="text" value={offerAmt} onChange={e => setOfferAmt(e.target.value.replace(/\D/g, ""))}
                        placeholder="Valor" style={{ flex: 1, background: "none", border: "none", color: "var(--color-text-primary)", fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-sans)", outline: "none" }} />
                    </div>
                    <button className="btn-primary" onClick={() => handleBuy(sel!)} disabled={parseInt(offerAmt) > budget} style={{ width: "100%" }}>💰 Fazer Proposta</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ OFFERS TAB ══════ */}
      {tab === "offers" && (
        <div style={{ flex: 1, overflow: "auto" }}>
          {pending.length === 0 && resolved.length === 0 ? (
            <div className="card" style={{ padding: "60px", textAlign: "center" }}>
              <p style={{ fontSize: "16px", color: "var(--color-text-muted)" }}>📭 Nenhuma proposta recebida</p>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "8px" }}>Avance rodadas ou liste jogadores para venda</p>
            </div>
          ) : (<>
            {pending.length > 0 && <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px", color: "var(--color-text-secondary)" }}>⏳ Pendentes</h3>
              {pending.map(o => <OfferCard key={o.id} offer={o} onRespond={respondToOffer} />)}
            </div>}
            {resolved.length > 0 && <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px", color: "var(--color-text-secondary)" }}>📋 Histórico</h3>
              {resolved.map(o => <OfferCard key={o.id} offer={o} onRespond={respondToOffer} />)}
            </div>}
          </>)}
        </div>
      )}

      {/* ══════ SELL TAB ══════ */}
      {tab === "sell" && (
        <div style={{ flex: 1, overflow: "auto" }}>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
            💡 Liste jogadores para venda — clubes de IA farão propostas automaticamente ao avançar.
            Mínimo de 16 jogadores no elenco. Jovens da base (≤19 anos, {"<"}5 jogos) são protegidos.
          </p>
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr>
                <th style={{ width: 40 }}>#</th><th>Nome</th><th style={{ width: 50 }}>Pos</th>
                <th style={{ width: 40 }}>CA</th><th style={{ width: 50 }}>Idade</th>
                <th style={{ width: 100 }}>Valor Est.</th><th style={{ width: 120 }}>Ação</th>
              </tr></thead>
              <tbody>
                {[...playerSquad].sort((a, b) => b.currentAbility - a.currentAbility).map(p => {
                  const isListed = listedForSale.includes(p.id);
                  const isYouth = p.age <= 19 && (p.seasonStats?.appearances ?? 0) < 5;
                  const atMinSquad = !isListed && (playerSquad.length - listedForSale.length) <= 16;
                  const cantSell = isYouth || atMinSquad;
                  const reason = isYouth ? "Jovem protegido" : atMinSquad ? "Elenco mínimo" : "";

                  return (
                    <tr key={p.id} style={{ background: isListed ? "rgba(239,68,68,0.06)" : undefined }}>
                      <td style={{ color: "var(--color-text-muted)" }}>{p.shirtNumber}</td>
                      <td style={{ fontWeight: 600 }}>
                        {p.name}
                        {isYouth && <span style={{ fontSize: "9px", marginLeft: "6px", padding: "1px 5px", borderRadius: "3px", background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 700 }}>BASE</span>}
                      </td>
                      <td><span style={{ fontSize: "10px", fontWeight: 800, color: "#fff", padding: "2px 6px", borderRadius: "4px", background: posBg(p.positionCategory) }}>{p.position}</span></td>
                      <td style={{ fontWeight: 700, color: getAttrColor(p.currentAbility) }}>{p.currentAbility}</td>
                      <td>{p.age}</td>
                      <td style={{ color: "var(--color-accent-secondary)", fontWeight: 500 }}>{fmt(calculateMarketValue(p))}</td>
                      <td>
                        {cantSell && !isListed ? (
                          <span style={{ fontSize: "10px", color: "var(--color-text-muted)", fontStyle: "italic" }}>🔒 {reason}</span>
                        ) : (
                          <button
                            onClick={() => isListed ? unlistForSale(p.id) : listForSale(p.id)}
                            style={{
                              padding: "4px 12px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
                              cursor: "pointer", fontFamily: "var(--font-sans)", border: "none",
                              background: isListed ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                              color: isListed ? "#ef4444" : "#10b981",
                            }}
                          >{isListed ? "❌ Remover" : "📋 Listar"}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function OfferCard({ offer, onRespond }: { offer: TransferOffer; onRespond: (id: number, accept: boolean) => void }) {
  return (
    <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "6px" }}>
      <div style={{ flex: 1 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{offer.player.name}</span>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", marginLeft: "8px" }}>{offer.player.position} • CA {offer.player.currentAbility}</span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          De <strong>{offer.fromClubName}</strong>
          {offer.reason && <span style={{ display: "block", fontSize: "10px", color: "var(--color-accent-secondary)", fontStyle: "italic", marginTop: "2px" }}>📋 {offer.reason}</span>}
        </div>
      </div>
      <div style={{ fontSize: "16px", fontWeight: 800, color: "#10b981", minWidth: "100px", textAlign: "right" }}>{fmt(offer.offerAmount)}</div>
      {offer.status === "pending" ? (
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-primary" onClick={() => onRespond(offer.id, true)} style={{ fontSize: "12px", padding: "6px 16px" }}>✅ Aceitar</button>
          <button className="btn-secondary" onClick={() => onRespond(offer.id, false)} style={{ fontSize: "12px", padding: "6px 16px" }}>❌ Recusar</button>
        </div>
      ) : (
        <span style={{ fontSize: "12px", fontWeight: 700, color: offer.status === "accepted" ? "#10b981" : "#ef4444" }}>
          {offer.status === "accepted" ? "ACEITA" : "RECUSADA"}
        </span>
      )}
    </div>
  );
}
