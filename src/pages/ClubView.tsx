import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useGame } from "../context/GameContext";
import { getAttrColor } from "../types/game";
import type { Player } from "../types/game";
import { initRPGData } from "../engine/rpgEngine";
import PlayerCard from "../components/PlayerCard";

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val}`;
}

function InfraStars({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", gap: "3px" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          fontSize: "14px",
          opacity: i <= level ? 1 : 0.2,
          filter: i <= level ? "none" : "grayscale(1)",
        }}>⭐</span>
      ))}
    </div>
  );
}

export default function ClubView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playerClub, allClubs, playerSquad, standings, allSquads, budget, makeTransferOffer, currentRound } = useGame();
  const [offerTarget, setOfferTarget] = useState<Player | null>(null);
  const [offerAmount, setOfferAmount] = useState(0);
  const [offerMsg, setOfferMsg] = useState<string | null>(null);
  const [scoutTarget, setScoutTarget] = useState<Player | null>(null);

  // ── Transfer Window Logic ──
  const isTransferWindowOpen = currentRound <= 5 || (currentRound >= 17 && currentRound <= 22);
  const windowLabel = isTransferWindowOpen
    ? currentRound <= 5 ? "🟢 Janela Aberta (Início)" : "🟢 Janela Aberta (Meio)"
    : "🔴 Janela Fechada";

  // ── Smart Negotiation AI ──
  function evaluateRivalOffer(
    player: Player,
    offerAmt: number,
    sellerClub: typeof club,
    sellerSquad: Player[],
  ): { accepted: boolean; reason: string } {
    const mv = player.marketValue;
    let requiredMultiplier = 1.1;
    const reasons: string[] = [];

    // Factor 1: Club reputation
    if (sellerClub.reputation > 7000) {
      requiredMultiplier += 0.3;
      reasons.push("Clube de alta reputação");
    } else if (sellerClub.reputation > 5000) {
      requiredMultiplier += 0.15;
    }

    // Factor 2: Is starter?
    const isStarter = sellerClub.startingLineup?.includes(player.id);
    if (isStarter) {
      requiredMultiplier += 0.7;
      reasons.push("Titular do time");
    }

    // Factor 3: Age
    if (player.age < 25) {
      requiredMultiplier += 0.2;
      reasons.push("Jogador jovem e promissor");
    } else if (player.age > 32) {
      requiredMultiplier -= 0.15;
    }

    // Factor 4: Position scarcity
    const samePosCnt = sellerSquad.filter(p => p.positionCategory === player.positionCategory && p.id !== player.id).length;
    if (samePosCnt < 2) {
      return { accepted: false, reason: `${sellerClub.shortName} não pode vender — ficaria sem jogadores na posição ${player.positionCategory}!` };
    }

    // Factor 5: Random ±10%
    requiredMultiplier += (Math.random() - 0.5) * 0.2;

    const threshold = mv * requiredMultiplier;
    if (offerAmt >= threshold) {
      return { accepted: true, reason: "Proposta aceita!" };
    }

    // Rejection reason
    const deficit = ((threshold - offerAmt) / mv * 100).toFixed(0);
    const mainReason = reasons.length > 0 ? reasons[0] : "Valor insuficiente";
    return { accepted: false, reason: `${mainReason} — oferta ${deficit}% abaixo do esperado` };
  }

  const clubId = id ? Number(id) : playerClub.id;
  const club = allClubs.find(c => c.id === clubId) || playerClub;
  const isPlayerClub = clubId === playerClub.id;

  if (!club) {
    return (
      <div style={styles.page}>
        <div style={styles.notFound}>
          <span style={{ fontSize: "48px" }}>🏟️</span>
          <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Clube não encontrado</h2>
          <button className="btn-secondary" onClick={() => navigate(-1)}>← Voltar</button>
        </div>
      </div>
    );
  }

  const history = club.history || [];
  const clubStandingIdx = standings.findIndex(s => s.clubId === clubId);
  const clubStanding = clubStandingIdx >= 0 ? { ...standings[clubStandingIdx], position: clubStandingIdx + 1 } : null;
  const rivalSquad = !isPlayerClub ? (allSquads.get(clubId) || []) : [];
  const squadForCalc = isPlayerClub ? playerSquad : rivalSquad;
  const avgCA = squadForCalc.length > 0
    ? Math.round(squadForCalc.reduce((s, p) => s + p.currentAbility, 0) / squadForCalc.length)
    : null;
  const totalWage = squadForCalc.reduce((s, p) => s + p.wage, 0);

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ fontSize: "13px" }}>
          ← Voltar
        </button>
      </div>

      {/* Club Header Card */}
      <div className="card" style={styles.heroCard}>
        <div style={styles.heroBg}>
          <div style={styles.shieldContainer}>
            <img 
              src={`assets/clubs/logos/${club.id}.png`} 
              alt={club.shortName}
              style={styles.shieldLogo}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div style={{
              ...styles.shieldLargeFallback,
              backgroundColor: club.colors.primary,
              borderColor: club.colors.secondary,
              display: 'none'
            }}>
              <span style={{ fontSize: "28px", fontWeight: 900, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                {club.shortName}
              </span>
            </div>
          </div>
          <div style={styles.heroInfo}>
            <h1 style={styles.clubName}>{club.name}</h1>
            <div style={styles.subtitle}>
              <span>🌍 {club.country}</span>
              <span style={styles.dot}>•</span>
              <span>🏆 {club.league}</span>
              <span style={styles.dot}>•</span>
              <span>📐 {club.formation}</span>
            </div>
          </div>
          {clubStanding && (
            <div style={styles.standingBadge}>
              <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                Posição
              </span>
              <span style={{
                fontSize: "28px", fontWeight: 900,
                color: clubStanding.position <= 4 ? "#10b981" : clubStanding.position >= 19 ? "#ef4444" : "var(--color-accent-primary)",
              }}>
                {clubStanding.position}º
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.gridContent}>
        {/* Key Stats */}
        <div style={styles.statsRow}>
          <div className="card" style={styles.statCard}>
            <span style={styles.statIcon}>🏟️</span>
            <span style={styles.statLabel}>Reputação</span>
            <span style={styles.statValue}>{club.reputation.toLocaleString()}</span>
            <div style={styles.repBar}>
              <div style={{ ...styles.repBarFill, width: `${(club.reputation / 10000) * 100}%` }} />
            </div>
          </div>
          <div className="card" style={styles.statCard}>
            <span style={styles.statIcon}>🏗️</span>
            <span style={styles.statLabel}>Infraestrutura</span>
            <InfraStars level={club.infrastructure} />
          </div>
          {isPlayerClub && (
            <>
              <div className="card" style={styles.statCard}>
                <span style={styles.statIcon}>💰</span>
                <span style={styles.statLabel}>Orçamento</span>
                <span style={{ ...styles.statValue, color: club.budget >= 0 ? "#10b981" : "#ef4444" }}>
                  {formatCurrency(club.budget)}
                </span>
              </div>
              <div className="card" style={styles.statCard}>
                <span style={styles.statIcon}>📋</span>
                <span style={styles.statLabel}>Folha Salarial</span>
                <span style={styles.statValue}>{formatCurrency(totalWage)}/mês</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                  Teto: {formatCurrency(club.wageBudget)}/mês
                </span>
              </div>
            </>
          )}
          {isPlayerClub && avgCA !== null && (
            <div className="card" style={styles.statCard}>
              <span style={styles.statIcon}>📊</span>
              <span style={styles.statLabel}>Média CA</span>
              <span style={{ ...styles.statValue, color: getAttrColor(avgCA) }}>{avgCA}</span>
              <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                {playerSquad.length} jogadores
              </span>
            </div>
          )}
        </div>

        {/* Kits */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={styles.sectionTitle}>👕 Uniformes</h2>
          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Principal</span>
              <div style={{ width: "100px", height: "100px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img 
                  src={`assets/clubs/kits/${club.id}_home.png`} 
                  alt="Principal" 
                  style={{ maxWidth: "100%", maxHeight: "100%", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }} 
                  onError={(e) => e.currentTarget.style.opacity = "0.2"}
                />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Reserva</span>
              <div style={{ width: "100px", height: "100px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img 
                  src={`assets/clubs/kits/${club.id}_away.png`} 
                  alt="Reserva" 
                  style={{ maxWidth: "100%", maxHeight: "100%", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }} 
                  onError={(e) => e.currentTarget.style.opacity = "0.2"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* League Standing Summary */}
        {clubStanding && (
          <div className="card" style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>📊 Temporada Atual</h2>
            <div style={styles.seasonGrid}>
              {[
                { label: "Jogos", value: clubStanding.played, color: "var(--color-text-primary)" },
                { label: "Vitórias", value: clubStanding.won, color: "#10b981" },
                { label: "Empates", value: clubStanding.drawn, color: "#f59e0b" },
                { label: "Derrotas", value: clubStanding.lost, color: "#ef4444" },
                { label: "Gols Pró", value: clubStanding.goalsFor, color: "var(--color-text-primary)" },
                { label: "Gols Contra", value: clubStanding.goalsAgainst, color: "var(--color-text-muted)" },
                { label: "Saldo", value: clubStanding.goalDifference > 0 ? `+${clubStanding.goalDifference}` : clubStanding.goalDifference, color: clubStanding.goalDifference > 0 ? "#10b981" : clubStanding.goalDifference < 0 ? "#ef4444" : "var(--color-text-muted)" },
                { label: "Pontos", value: clubStanding.points, color: "var(--color-accent-primary)" },
              ].map((item, i) => (
                <div key={i} style={styles.seasonStat}>
                  <span style={{ fontSize: "24px", fontWeight: 900, color: item.color as string }}>{item.value}</span>
                  <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.3px", fontWeight: 600 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="card" style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>📜 Histórico do Clube</h2>

          {history.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: "32px", opacity: 0.5 }}>🏆</span>
              <p style={{ margin: "8px 0 0", fontSize: "13px" }}>Nenhum registro histórico disponível.</p>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                O histórico é gerado ao final de cada temporada.
              </span>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Temp</th>
                  <th>Liga</th>
                  <th style={{ width: 45 }}>Pos</th>
                  <th style={{ width: 45 }}>Pts</th>
                  <th style={{ width: 35 }}>V</th>
                  <th style={{ width: 35 }}>E</th>
                  <th style={{ width: 35 }}>D</th>
                  <th style={{ width: 40 }}>GP</th>
                  <th style={{ width: 40 }}>GC</th>
                  <th style={{ width: 60 }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{h.season}</td>
                    <td>{h.league}</td>
                    <td style={{
                      fontWeight: 700,
                      color: h.isChampion ? "#fbbf24" : h.position <= 4 ? "#10b981" : "var(--color-text-primary)",
                    }}>
                      {h.position}º
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--color-accent-primary)" }}>{h.points}</td>
                    <td style={{ color: "#10b981" }}>{h.won}</td>
                    <td style={{ color: "#f59e0b" }}>{h.drawn}</td>
                    <td style={{ color: "#ef4444" }}>{h.lost}</td>
                    <td>{h.goalsFor}</td>
                    <td>{h.goalsAgainst}</td>
                    <td>
                      {h.isChampion && <span title="Campeão" style={{ marginRight: "4px" }}>🏆</span>}
                      {h.promoted && <span title="Promovido" style={{ marginRight: "4px" }}>📈</span>}
                      {h.relegated && <span title="Rebaixado">📉</span>}
                      {!h.isChampion && !h.promoted && !h.relegated && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rival Squad as Cards */}
        {!isPlayerClub && rivalSquad.length > 0 && (
          <div className="card" style={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ ...styles.sectionTitle, margin: 0 }}>👥 Elenco — {club.shortName}</h2>
              <span style={{
                fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px",
                background: isTransferWindowOpen ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: isTransferWindowOpen ? "#10b981" : "#ef4444",
                border: `1px solid ${isTransferWindowOpen ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              }}>{windowLabel}</span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "14px",
            }}>
              {rivalSquad.map(player => {
                const rpg = player.rpg || initRPGData(player.currentAbility);
                return (
                  <div key={player.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ cursor: "pointer" }} onClick={() => setScoutTarget(player)}>
                      <PlayerCard player={{ ...player, rpg }} />
                    </div>
                    <button
                      className="btn-primary"
                      style={{
                        padding: "6px", fontSize: "11px", borderRadius: "6px",
                        opacity: isTransferWindowOpen ? 1 : 0.4,
                        pointerEvents: isTransferWindowOpen ? "auto" : "none",
                      }}
                      onClick={() => {
                        setOfferTarget(player);
                        setOfferAmount(Math.round(player.marketValue * 1.2));
                        setOfferMsg(null);
                      }}
                      disabled={!isTransferWindowOpen}
                      title={isTransferWindowOpen ? "Fazer proposta" : "Janela de transferências fechada"}
                    >
                      {isTransferWindowOpen ? "💰 Fazer Proposta" : "🔒 Janela Fechada"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Transfer Offer Modal */}
      {offerTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000,
        }} onClick={() => setOfferTarget(null)}>
          <div style={{
            background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
            borderRadius: "14px", padding: "24px", width: "420px", maxWidth: "90vw",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>
              💰 Proposta por {offerTarget.name}
            </h2>

            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              <div style={{ width: "140px" }}>
                <PlayerCard player={{ ...offerTarget, rpg: offerTarget.rpg || initRPGData(offerTarget.currentAbility) }} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Posição: <strong>{offerTarget.position}</strong>
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Idade: <strong>{offerTarget.age}</strong>
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  CA: <strong style={{ color: getAttrColor(offerTarget.currentAbility) }}>{offerTarget.currentAbility}</strong>
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Valor de Mercado: <strong style={{ color: "#10b981" }}>{formatCurrency(offerTarget.marketValue)}</strong>
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Seu Saldo: <strong style={{ color: budget >= 0 ? "#10b981" : "#ef4444" }}>{formatCurrency(budget)}</strong>
                </div>
              </div>
            </div>

            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Valor da Proposta
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px", marginBottom: "12px" }}>
              <input
                type="range"
                min={Math.round(offerTarget.marketValue * 0.5)}
                max={Math.round(offerTarget.marketValue * 3)}
                step={100000}
                value={offerAmount}
                onChange={e => setOfferAmount(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: "14px", fontWeight: 900, color: "var(--color-accent-primary)", minWidth: "100px", textAlign: "right" }}>
                {formatCurrency(offerAmount)}
              </span>
            </div>

            {offerMsg && (
              <div className="animate-fade-in" style={{
                padding: "10px 14px", borderRadius: "8px", marginBottom: "12px",
                background: offerMsg.includes("✅") ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                color: offerMsg.includes("✅") ? "#10b981" : "#ef4444",
                border: `1px solid ${offerMsg.includes("✅") ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                fontSize: "13px", fontWeight: 700,
              }}>
                {offerMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: "12px" }}
                onClick={() => {
                  if (!isTransferWindowOpen) {
                    setOfferMsg("🔒 Janela de transferências fechada!");
                    return;
                  }
                  if (offerAmount > budget) {
                    setOfferMsg("❌ Saldo insuficiente!");
                    return;
                  }
                  const rivalSq = allSquads.get(clubId) || [];
                  const { accepted, reason } = evaluateRivalOffer(offerTarget, offerAmount, club, rivalSq);
                  if (accepted) {
                    if (typeof makeTransferOffer === "function") {
                      makeTransferOffer(offerTarget, clubId, offerAmount);
                    }
                    setOfferMsg(`✅ ${club.shortName} aceitou! ${offerTarget.name} é seu!`);
                    setTimeout(() => setOfferTarget(null), 2000);
                  } else {
                    setOfferMsg(`❌ ${reason}`);
                  }
                }}
              >
                📨 Enviar Proposta
              </button>
              <button className="btn-secondary" style={{ padding: "12px" }} onClick={() => setOfferTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scout Report Modal */}
      {scoutTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 999,
        }} onClick={() => setScoutTarget(null)}>
          <div style={{
            background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
            borderRadius: "14px", padding: "24px", width: "520px", maxWidth: "90vw",
            maxHeight: "85vh", overflow: "auto",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>
              🔍 Scout Report — {scoutTarget.name}
            </h2>

            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "150px" }}>
                <PlayerCard player={{ ...scoutTarget, rpg: scoutTarget.rpg || initRPGData(scoutTarget.currentAbility) }} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Posição: <strong>{scoutTarget.position}</strong></div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Idade: <strong>{scoutTarget.age} anos</strong></div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>CA: <strong style={{ color: getAttrColor(scoutTarget.currentAbility) }}>{scoutTarget.currentAbility}</strong></div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Valor: <strong style={{ color: "#10b981" }}>{formatCurrency(scoutTarget.marketValue)}</strong></div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Salário: <strong>{formatCurrency(scoutTarget.wage)}/mês</strong></div>
                {scoutTarget.form !== undefined && (
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Forma: <strong style={{ color: scoutTarget.form > 65 ? "#10b981" : scoutTarget.form > 40 ? "#f59e0b" : "#ef4444" }}>{scoutTarget.form}</strong></div>
                )}
              </div>
            </div>

            {/* Season Stats */}
            {scoutTarget.seasonStats && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>📊 Temporada Atual</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {[
                    { label: "Jogos", value: scoutTarget.seasonStats.appearances, icon: "⚽" },
                    { label: "Gols", value: scoutTarget.seasonStats.goals, icon: "🥅" },
                    { label: "Assist.", value: scoutTarget.seasonStats.assists, icon: "🎯" },
                    { label: "Nota Méd.", value: scoutTarget.seasonStats.avgRating?.toFixed(1) || "—", icon: "⭐" },
                    { label: "Amarelos", value: scoutTarget.seasonStats.yellowCards, icon: "🟡" },
                    { label: "Vermelhos", value: scoutTarget.seasonStats.redCards, icon: "🔴" },
                    { label: "Clean S.", value: scoutTarget.seasonStats.cleanSheets, icon: "🧤" },
                    { label: "MOTM", value: scoutTarget.seasonStats.motm, icon: "🏆" },
                  ].map(s => (
                    <div key={s.label} style={{
                      textAlign: "center", padding: "10px 6px", borderRadius: "8px",
                      background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
                    }}>
                      <div style={{ fontSize: "16px" }}>{s.icon}</div>
                      <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--color-text-primary)" }}>{s.value}</div>
                      <div style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparison vs your squad average */}
            {(() => {
              const samePos = playerSquad.filter(p => p.positionCategory === scoutTarget.positionCategory);
              const avgCA = samePos.length > 0 ? Math.round(samePos.reduce((s, p) => s + p.currentAbility, 0) / samePos.length) : 0;
              const diff = scoutTarget.currentAbility - avgCA;
              return (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>📈 Comparativo</h3>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ flex: 1, textAlign: "center", padding: "12px", borderRadius: "8px", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Jogador</div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: getAttrColor(scoutTarget.currentAbility) }}>{scoutTarget.currentAbility}</div>
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: diff > 0 ? "#10b981" : diff < 0 ? "#ef4444" : "#f59e0b" }}>
                      {diff > 0 ? `+${diff}` : diff}
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: "12px", borderRadius: "8px", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Média {scoutTarget.positionCategory}</div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: getAttrColor(avgCA) }}>{avgCA || "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-primary"
                style={{
                  flex: 1, padding: "12px",
                  opacity: isTransferWindowOpen ? 1 : 0.4,
                }}
                disabled={!isTransferWindowOpen}
                onClick={() => {
                  setOfferTarget(scoutTarget);
                  setOfferAmount(Math.round(scoutTarget.marketValue * 1.2));
                  setOfferMsg(null);
                  setScoutTarget(null);
                }}
              >
                {isTransferWindowOpen ? "💰 Fazer Proposta" : "🔒 Janela Fechada"}
              </button>
              <button className="btn-secondary" style={{ padding: "12px" }} onClick={() => setScoutTarget(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "24px",
    height: "100%",
    overflow: "auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  notFound: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "12px",
    color: "var(--color-text-muted)",
  },
  heroCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: "20px",
  },
  heroBg: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "24px",
    background: "linear-gradient(135deg, var(--color-bg-secondary), var(--color-bg-card))",
  },
  shieldContainer: {
    width: "80px",
    height: "80px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldLogo: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
  },
  shieldLargeFallback: {
    width: "100%",
    height: "100%",
    borderRadius: "16px",
    border: "3px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  heroInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: "26px",
    fontWeight: 900,
    color: "var(--color-text-primary)",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "var(--color-text-secondary)",
    fontSize: "13px",
  },
  dot: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
  },
  standingBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    background: "var(--color-bg-hover)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
    padding: "12px 20px",
    flexShrink: 0,
  },
  gridContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
  },
  statCard: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    textAlign: "center",
  },
  statIcon: { fontSize: "20px" },
  statLabel: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600,
  },
  statValue: {
    fontSize: "18px",
    fontWeight: 900,
    color: "var(--color-text-primary)",
  },
  repBar: {
    width: "100%",
    height: "4px",
    borderRadius: "2px",
    background: "var(--color-bg-hover)",
    overflow: "hidden",
    marginTop: "4px",
  },
  repBarFill: {
    height: "100%",
    borderRadius: "2px",
    background: "linear-gradient(90deg, #10b981, #f59e0b)",
    transition: "width 0.5s ease",
  },
  sectionCard: { padding: "20px" },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--color-text-primary)",
    margin: "0 0 16px 0",
  },
  seasonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
  },
  seasonStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    padding: "12px 8px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    background: "var(--color-bg-card)",
    borderRadius: "8px",
    border: "1px dashed var(--color-border)",
    textAlign: "center",
    color: "var(--color-text-secondary)",
  },
};
