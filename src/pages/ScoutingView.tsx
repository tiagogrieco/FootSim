import { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { getAttrColor, type Player, type PositionCategory, type Club } from "../types/game";

type FilterPos = "ALL" | PositionCategory;

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

export default function ScoutingView() {
  const { allSquads, allClubs, playerClub } = useGame();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPos, setFilterPos] = useState<FilterPos>("ALL");
  const [minAge, setMinAge] = useState<number | "">("");
  const [maxAge, setMaxAge] = useState<number | "">("");
  const [minCA, setMinCA] = useState<number | "">("");
  const [minPA, setMinPA] = useState<number | "">("");

  const [selectedPlayer, setSelectedPlayer] = useState<{ player: Player; club: Club } | null>(null);

  // Flatten all players with their clubs
  const allPlayersWithClub = useMemo(() => {
    const list: { player: Player; club: Club }[] = [];
    for (const [clubId, squad] of allSquads) {
      // Don't scout our own players by default, though we could
      if (clubId === playerClub.id) continue;
      
      const club = allClubs.find(c => c.id === clubId);
      if (club) {
        for (const player of squad) {
          list.push({ player, club });
        }
      }
    }
    return list;
  }, [allSquads, allClubs, playerClub.id]);

  // Apply filters
  const filteredPlayers = useMemo(() => {
    return allPlayersWithClub.filter(({ player }) => {
      // Name
      if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      // Pos
      if (filterPos !== "ALL" && player.positionCategory !== filterPos) return false;
      // Age
      if (minAge !== "" && player.age < Number(minAge)) return false;
      if (maxAge !== "" && player.age > Number(maxAge)) return false;
      // CA
      if (minCA !== "" && player.currentAbility < Number(minCA)) return false;
      // PA
      if (minPA !== "" && player.potentialAbility < Number(minPA)) return false;

      return true;
    }).sort((a, b) => b.player.currentAbility - a.player.currentAbility);
  }, [allPlayersWithClub, searchTerm, filterPos, minAge, maxAge, minCA, minPA]);

  // Show top 100 max to prevent lagging on render
  const displayPlayers = filteredPlayers.slice(0, 100);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔎 Olheiros (Scouting)</h1>
      </div>

      <div style={styles.content}>
        {/* Sidebar for Filters */}
        <div className="card" style={styles.filterSidebar}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--color-text-secondary)" }}>
            Filtros de Busca
          </h3>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Nome</label>
            <input 
              type="text" 
              placeholder="Buscar jogador..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Posição</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(["ALL", "GK", "DEF", "MID", "FWD"] as FilterPos[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPos(f)}
                  style={{
                    ...styles.filterBtn,
                    ...(filterPos === f ? styles.filterBtnActive : {}),
                  }}
                >
                  {f === "ALL" ? "Qualquer" : f}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Idade Mín.</label>
              <input 
                type="number" 
                placeholder="Ex: 16"
                value={minAge}
                onChange={e => setMinAge(e.target.value ? Number(e.target.value) : "")}
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Idade Máx.</label>
              <input 
                type="number" 
                placeholder="Ex: 21"
                value={maxAge}
                onChange={e => setMaxAge(e.target.value ? Number(e.target.value) : "")}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>CA Mín.</label>
              <input 
                type="number" 
                placeholder="Ex: 70"
                value={minCA}
                onChange={e => setMinCA(e.target.value ? Number(e.target.value) : "")}
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>PA Mín.</label>
              <input 
                type="number" 
                placeholder="Ex: 85"
                value={minPA}
                onChange={e => setMinPA(e.target.value ? Number(e.target.value) : "")}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              Mostrando {displayPlayers.length} de {filteredPlayers.length} jogadores encontrados
            </span>
          </div>
        </div>

        {/* Results / Detail View */}
        <div style={styles.mainArea}>
          <div className="card" style={styles.resultsCard}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th style={{ width: 50 }}>Pos</th>
                  <th style={{ width: 50 }}>Idade</th>
                  <th>Clube</th>
                  <th style={{ width: 40 }}>CA</th>
                  <th style={{ width: 40 }}>PA</th>
                  <th style={{ width: 100 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {displayPlayers.map(({ player, club }) => (
                  <tr 
                    key={player.id} 
                    onClick={() => setSelectedPlayer({ player, club })}
                    style={{ 
                      cursor: "pointer",
                      background: selectedPlayer?.player.id === player.id ? "var(--color-bg-active)" : "transparent"
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>{player.name}</td>
                    <td>
                      <span style={{ ...styles.posBadge, background: getBadgeColor(player.positionCategory), fontSize: "10px", padding: "2px 6px" }}>
                        {player.position}
                      </span>
                    </td>
                    <td>{player.age}</td>
                    <td style={{ fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <img src={`${import.meta.env.BASE_URL}assets/clubs/logos/${club.id}.png`} style={{ width: "20px", height: "20px", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        {club.name}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: getAttrColor(player.currentAbility) }}>{player.currentAbility}</td>
                    <td style={{ fontWeight: 700, color: getAttrColor(player.potentialAbility) }}>{player.potentialAbility}</td>
                    <td style={{ color: "var(--color-accent-secondary)", fontWeight: 500 }}>{formatCurrency(player.marketValue)}</td>
                  </tr>
                ))}
                {displayPlayers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
                      Nenhum jogador encontrado com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Selected Player Detail */}
          {selectedPlayer && (
            <div className="card" style={styles.detailCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 800 }}>{selectedPlayer.player.name}</h2>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                    <span style={{ ...styles.posBadge, background: getBadgeColor(selectedPlayer.player.positionCategory) }}>{selectedPlayer.player.position}</span>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      {selectedPlayer.player.age} anos • 
                      <img src={`${import.meta.env.BASE_URL}assets/clubs/logos/${selectedPlayer.club.id}.png`} style={{ width: "16px", height: "16px", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      {selectedPlayer.club.name}
                    </span>
                  </div>
                </div>
                <div style={styles.caDisplay}>
                  <span style={{ fontSize: "32px", fontWeight: 900, color: getAttrColor(selectedPlayer.player.currentAbility) }}>
                    {selectedPlayer.player.currentAbility}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>CA</span>
                </div>
              </div>

              {/* Attributes */}
              <div style={styles.attrsRow}>
                {[
                  { label: "VEL", key: "pace" as const },
                  { label: "FIN", key: "shooting" as const },
                  { label: "PAS", key: "passing" as const },
                  { label: "DRI", key: "dribbling" as const },
                  { label: "DEF", key: "defending" as const },
                  { label: "FIS", key: "physical" as const },
                  { label: "GOL", key: "goalkeeping" as const },
                ].map(a => (
                  <div key={a.key} style={styles.attrBox}>
                    <span style={{ fontSize: "18px", fontWeight: 800, color: getAttrColor(selectedPlayer.player.attributes[a.key]) }}>
                      {selectedPlayer.player.attributes[a.key]}
                    </span>
                    <span style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>{a.label}</span>
                  </div>
                ))}
              </div>
              
              <div style={styles.dealInfo}>
                <div style={styles.dealRow}>
                  <span>Potencial (PA)</span>
                  <span style={{ fontWeight: 700, color: getAttrColor(selectedPlayer.player.potentialAbility) }}>
                    {selectedPlayer.player.potentialAbility}
                  </span>
                </div>
                <div style={styles.dealRow}>
                  <span>Valor Estimado</span>
                  <span style={{ fontWeight: 700, color: "var(--color-accent-secondary)" }}>
                    {formatCurrency(selectedPlayer.player.marketValue)}
                  </span>
                </div>
                <div style={styles.dealRow}>
                  <span>Salário Estimado</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(selectedPlayer.player.wage)}/mês</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 },
  title: { fontSize: "24px", fontWeight: 800 },
  
  content: { flex: 1, display: "flex", gap: "16px", overflow: "hidden" },
  
  filterSidebar: { 
    width: "280px", flexShrink: 0, padding: "20px", display: "flex", flexDirection: "column", gap: "16px",
    overflowY: "auto"
  },
  filterGroup: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  filterRow: { display: "flex", gap: "12px" },
  label: { fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)" },
  input: {
    background: "var(--color-bg-hover)", border: "1px solid var(--color-border)",
    padding: "8px 12px", borderRadius: "6px", color: "var(--color-text-primary)",
    fontFamily: "var(--font-sans)", fontSize: "13px", outline: "none", width: "100%"
  },
  filterBtn: {
    padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 600,
    background: "var(--color-bg-hover)", border: "1px solid transparent",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
  },
  filterBtnActive: {
    background: "var(--color-accent-primary)", color: "#fff",
  },

  mainArea: { flex: 1, display: "flex", gap: "16px", overflow: "hidden" },
  resultsCard: { flex: 1, padding: 0, overflowY: "auto" },
  
  detailCard: { width: "320px", flexShrink: 0, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" },
  posBadge: {
    fontSize: "10px", fontWeight: 800, color: "#fff", padding: "3px 8px",
    borderRadius: "4px", textTransform: "uppercase", flexShrink: 0,
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  caDisplay: { display: "flex", flexDirection: "column", alignItems: "center" },
  attrsRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" },
  attrBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
    padding: "8px 2px", background: "var(--color-bg-hover)", borderRadius: "6px",
  },
  dealInfo: { display: "flex", flexDirection: "column", gap: "6px" },
  dealRow: {
    display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--color-text-secondary)",
    padding: "6px 0", borderBottom: "1px solid var(--color-border)",
  },
};
