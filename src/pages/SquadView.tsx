import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Player } from "../types/game";
import { getAttrColor } from "../types/game";
import { useGame } from "../context/GameContext";
import { initRPGData } from "../engine/rpgEngine";
import PlayerCard from "../components/PlayerCard";

type SortKey = "name" | "age" | "position" | "currentAbility" | "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical" | "goalkeeping" | "fitness" | "morale" | "form" | "happiness";
type SortDir = "asc" | "desc";
type FilterPos = "ALL" | "GK" | "DEF" | "MID" | "FWD";
type ViewMode = "table" | "cards";

const POSITION_ORDER: Record<string, number> = {
  GK: 1, CB: 2, RB: 3, LB: 4, CDM: 5, CM: 6, CAM: 7, LM: 8, RM: 9, LW: 10, RW: 11, CF: 12, ST: 13,
};

const POSITION_FILTERS: { label: string; value: FilterPos }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Goleiros", value: "GK" },
  { label: "Defensores", value: "DEF" },
  { label: "Meio-campo", value: "MID" },
  { label: "Atacantes", value: "FWD" },
];

const ATTR_COLUMNS: { key: keyof Player["attributes"]; label: string; short: string; tip: string }[] = [
  { key: "pace", label: "Velocidade", short: "VEL", tip: "Velocidade de sprint e aceleração" },
  { key: "shooting", label: "Finalização", short: "FIN", tip: "Precisão e potência nos chutes" },
  { key: "passing", label: "Passe", short: "PAS", tip: "Qualidade de passes curtos e longos" },
  { key: "dribbling", label: "Drible", short: "DRI", tip: "Controle de bola e habilidade técnica" },
  { key: "defending", label: "Defesa", short: "DEF", tip: "Marcação, desarme e interceptação" },
  { key: "physical", label: "Físico", short: "FIS", tip: "Força, resistência e presença física" },
  { key: "goalkeeping", label: "Goleiro", short: "GOL", tip: "Habilidade de defesa de gol (relevante apenas para GKs)" },
];

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <span style={{ position: "relative", cursor: "help" }} className="stat-tooltip-wrap">
      {children}
      <span className="stat-tooltip">{text}</span>
    </span>
  );
}

function getBadgeClass(pos: string): string {
  if (pos === "GK") return "badge-gk";
  if (["CB", "LB", "RB"].includes(pos)) return "badge-def";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "badge-mid";
  return "badge-fwd";
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val}`;
}

export default function SquadView() {
  const { playerSquad: players, playerClub: club } = useGame();
  const navigate = useNavigate();

  const [sortKey, setSortKey] = useState<SortKey>("currentAbility");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterPos, setFilterPos] = useState<FilterPos>("ALL");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const filtered = useMemo(() => {
    let list = [...players];
    if (filterPos !== "ALL") {
      list = list.filter(p => p.positionCategory === filterPos);
    }
    list.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortKey === "name") {
        aVal = a.name; bVal = b.name;
      } else if (sortKey === "position") {
        aVal = POSITION_ORDER[a.position] ?? 99;
        bVal = POSITION_ORDER[b.position] ?? 99;
      } else if (sortKey in a.attributes) {
        aVal = a.attributes[sortKey as keyof typeof a.attributes];
        bVal = b.attributes[sortKey as keyof typeof b.attributes];
      } else {
        aVal = (a as unknown as Record<string, unknown>)[sortKey] as number;
        bVal = (b as unknown as Record<string, unknown>)[sortKey] as number;
      }

      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return list;
  }, [players, sortKey, sortDir, filterPos]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{ width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img 
              src={`/assets/clubs/logos/${club.id}.png`} 
              alt={club.shortName}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div>
            <h1 style={styles.clubName}>{club.name}</h1>
            <span style={styles.clubMeta}>{club.league} • {club.formation} • Orçamento: {formatCurrency(club.budget)}</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Jogadores</span>
            <span style={styles.statValue}>{players.length}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Folha Salarial</span>
            <span style={styles.statValue}>{formatCurrency(players.reduce((s, p) => s + p.wage, 0))}/mês</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Média CA</span>
            <span style={styles.statValue}>{Math.round(players.reduce((s, p) => s + p.currentAbility, 0) / players.length)}</span>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          {POSITION_FILTERS.map(f => (
            <button
              key={f.value}
              style={{
                ...styles.filterBtn,
                ...(filterPos === f.value ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilterPos(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={styles.resultCount}>{filtered.length} jogadores</span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            style={{
              ...styles.filterBtn,
              ...(viewMode === "cards" ? styles.filterBtnActive : {}),
            }}
            onClick={() => setViewMode("cards")}
          >🃏 Cartas</button>
          <button
            style={{
              ...styles.filterBtn,
              ...(viewMode === "table" ? styles.filterBtnActive : {}),
            }}
            onClick={() => setViewMode("table")}
          >📊 Tabela</button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "cards" ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px",
          padding: "16px",
        }}>
          {filtered.map(player => {
            const rpg = player.rpg || initRPGData(player.currentAbility);
            return (
              <div key={player.id} onClick={() => navigate(`/game/player/${player.id}`)} style={{ cursor: "pointer" }}>
                <PlayerCard player={{ ...player, rpg }} />
              </div>
            );
          })}
        </div>
      ) : (
      <div style={styles.tableWrapper}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th onClick={() => handleSort("name")} style={{ minWidth: 160 }}>Nome{sortIndicator("name")}</th>
                <th onClick={() => handleSort("age")} style={{ width: 50 }}><Tooltip text="Idade do jogador">Idade{sortIndicator("age")}</Tooltip></th>
                <th onClick={() => handleSort("position")} style={{ width: 60 }}><Tooltip text="Posição em campo">Pos{sortIndicator("position")}</Tooltip></th>
                <th onClick={() => handleSort("currentAbility")} style={{ width: 50 }}><Tooltip text="Habilidade Atual — Overall do jogador (0-99)">CA{sortIndicator("currentAbility")}</Tooltip></th>
                {ATTR_COLUMNS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key as SortKey)} style={{ width: 50 }}><Tooltip text={col.tip}>{col.short}{sortIndicator(col.key as SortKey)}</Tooltip></th>
                ))}
                <th onClick={() => handleSort("fitness")} style={{ width: 50 }}><Tooltip text="Condição física — Afeta desempenho em campo">FIT{sortIndicator("fitness")}</Tooltip></th>
                <th onClick={() => handleSort("morale")} style={{ width: 50 }}><Tooltip text="Moral — Influenciado por resultados e treinos">MOR{sortIndicator("morale")}</Tooltip></th>
                <th onClick={() => handleSort("form")} style={{ width: 60 }}><Tooltip text="Forma — Média das últimas atuações">FOR{sortIndicator("form")}</Tooltip></th>
                <th onClick={() => handleSort("happiness")} style={{ width: 50 }}><Tooltip text="Satisfação — Tempo de jogo e resultados">SAT{sortIndicator("happiness")}</Tooltip></th>
                <th style={{ width: 36 }}><Tooltip text="Gols marcados na temporada">⚽</Tooltip></th>
                <th style={{ width: 36 }}><Tooltip text="Assistências na temporada">🅰️</Tooltip></th>
                <th style={{ width: 36 }}><Tooltip text="Rating médio — Calculado por posição: GK(clean sheets), DEF(defesa), MID(passes), FWD(gols)">⭐</Tooltip></th>
                <th style={{ width: 90 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(player => (
                <tr
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  style={{
                    cursor: "pointer",
                    background: selectedPlayer?.id === player.id ? "var(--color-bg-active)" : undefined,
                    opacity: player.injuryDays && player.injuryDays > 0 ? 0.6 : 1,
                  }}
                >
                  <td style={{ color: "var(--color-text-muted)" }}>{player.shirtNumber}</td>
                  <td style={{ fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary)" }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/game/player/${player.id}`); }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                  >
                    {(player.injuryDays ?? 0) > 0 && (
                      <span style={{ marginRight: '6px' }} title={`Lesionado (${player.injuryDays} dias)`}>🏥</span>
                    )}
                    {(player.strikeDays ?? 0) > 0 && (
                      <span style={{ marginRight: '6px' }} title={`EM GREVE (${player.strikeDays} dias)`}>✊</span>
                    )}
                    {(player.playtimePromiseMatches ?? 0) > 0 && (
                      <span style={{ marginRight: '6px' }} title="Promessa de tempo de jogo ativa">🤝</span>
                    )}
                    {player.name}
                  </td>
                  <td>{player.age}</td>
                  <td><span className={`badge ${getBadgeClass(player.position)}`}>{player.position}</span></td>
                  <td style={{ fontWeight: 700, color: getAttrColor(player.currentAbility) }}>{player.currentAbility}</td>
                  {ATTR_COLUMNS.map(col => (
                    <td key={col.key} style={{ color: getAttrColor(player.attributes[col.key]) }}>
                      {player.attributes[col.key]}
                    </td>
                  ))}
                  <td>
                    <div className="attr-bar" style={{ width: 40 }}>
                      <div className="attr-bar-fill" style={{ width: `${player.fitness}%`, background: getAttrColor(player.fitness) }} />
                    </div>
                  </td>
                  <td>
                    <div className="attr-bar" style={{ width: 40 }}>
                      <div className="attr-bar-fill" style={{ width: `${player.morale}%`, background: getAttrColor(player.morale) }} />
                    </div>
                  </td>
                  <td style={{ fontSize: "13px", fontWeight: 700 }}>
                    {player.form >= 75 ? "🔥" : player.form <= 40 ? "❄️" : "➖"} {player.form}
                  </td>
                  <td>
                    <div className="attr-bar" style={{ width: 40 }}>
                      <div className="attr-bar-fill" style={{ width: `${player.happiness ?? 50}%`, background: (player.happiness ?? 50) < 30 ? "#ef4444" : (player.happiness ?? 50) < 60 ? "#f59e0b" : "#10b981" }} />
                    </div>
                    {(player.happiness ?? 50) < 30 && <span title="Insatisfeito — pede transferência">⚠️</span>}
                  </td>
                  <td style={{ fontWeight: 700, color: (player.seasonStats?.goals || 0) > 0 ? "#10b981" : "var(--color-text-muted)" }}>
                    {player.seasonStats?.goals || 0}
                  </td>
                  <td style={{ fontWeight: 600, color: (player.seasonStats?.assists || 0) > 0 ? "#3b82f6" : "var(--color-text-muted)" }}>
                    {player.seasonStats?.assists || 0}
                  </td>
                  <td style={{ fontWeight: 600, color: (player.seasonStats?.avgRating || 0) >= 7.5 ? "#10b981" : (player.seasonStats?.avgRating || 0) >= 6.5 ? "#f59e0b" : "var(--color-text-muted)" }}>
                    {player.seasonStats?.avgRating ? player.seasonStats.avgRating.toFixed(1) : "-"}
                  </td>
                  <td style={{ color: "var(--color-accent-secondary)", fontWeight: 500 }}>{formatCurrency(player.marketValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Player Detail Panel */}
      {selectedPlayer && (
        <PlayerDetailPanel player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}

function PlayerDetailPanel({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <div style={panelStyles.overlay} onClick={onClose}>
      <div style={panelStyles.panel} className="animate-slide-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={panelStyles.header}>
          <div style={panelStyles.shirtNumber}>{player.shirtNumber}</div>
          <div>
            <h2 style={panelStyles.name}>{player.name}</h2>
            <div style={panelStyles.meta}>
              <span className={`badge ${getBadgeClass(player.position)}`}>{player.position}</span>
              <span>{player.age} anos</span>
              <span>{player.nationality}</span>
            </div>
          </div>
          <button style={panelStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* CA / PA */}
        <div style={panelStyles.abilityRow}>
          <div style={panelStyles.abilityBox}>
            <span style={panelStyles.abilityLabel}>Current Ability</span>
            <span style={{ ...panelStyles.abilityValue, color: getAttrColor(player.currentAbility) }}>{player.currentAbility}</span>
          </div>
          <div style={panelStyles.abilityBox}>
            <span style={panelStyles.abilityLabel}>Potential Ability</span>
            <span style={{ ...panelStyles.abilityValue, color: getAttrColor(player.potentialAbility) }}>{player.potentialAbility}</span>
          </div>
          <div style={panelStyles.abilityBox}>
            <span style={panelStyles.abilityLabel}>Crescimento</span>
            <span style={{ ...panelStyles.abilityValue, color: player.potentialAbility - player.currentAbility > 5 ? "#10b981" : "#94a3b8" }}>
              +{player.potentialAbility - player.currentAbility}
            </span>
          </div>
        </div>

        {/* Attributes */}
        <div style={panelStyles.attrsGrid}>
          {ATTR_COLUMNS.map(col => (
            <div key={col.key} style={panelStyles.attrRow}>
              <span style={panelStyles.attrLabel}>{col.label}</span>
              <div style={panelStyles.attrBarOuter}>
                <div style={{
                  ...panelStyles.attrBarInner,
                  width: `${player.attributes[col.key]}%`,
                  background: `linear-gradient(90deg, ${getAttrColor(player.attributes[col.key])}aa, ${getAttrColor(player.attributes[col.key])})`,
                }} />
              </div>
              <span style={{ ...panelStyles.attrValue, color: getAttrColor(player.attributes[col.key]) }}>
                {player.attributes[col.key]}
              </span>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div style={panelStyles.footerInfo}>
          <div><span style={panelStyles.footerLabel}>Valor de Mercado</span> <span style={{ color: "var(--color-accent-secondary)" }}>{formatCurrency(player.marketValue)}</span></div>
          <div><span style={panelStyles.footerLabel}>Salário</span> <span>{formatCurrency(player.wage)}/mês</span></div>
          <div><span style={panelStyles.footerLabel}>Fitness</span> <span style={{ color: getAttrColor(player.fitness) }}>{player.fitness}%</span></div>
          <div><span style={panelStyles.footerLabel}>Moral</span> <span style={{ color: getAttrColor(player.morale) }}>{player.morale}%</span></div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--color-bg-primary)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    background: "var(--color-bg-secondary)",
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backBtn: {
    background: "var(--color-bg-hover)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    padding: "6px 14px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontSize: "13px",
    transition: "all 0.2s",
  },
  clubName: {
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--color-text-primary)",
  },
  clubMeta: {
    fontSize: "12px",
    color: "var(--color-text-muted)",
  },
  headerRight: {
    display: "flex",
    gap: "20px",
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
  },
  statLabel: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--color-accent-primary)",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
  },
  filterGroup: {
    display: "flex",
    gap: "6px",
  },
  filterBtn: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    padding: "6px 14px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    fontWeight: 500,
    transition: "all 0.2s",
  },
  filterBtnActive: {
    background: "var(--color-accent-primary)",
    borderColor: "var(--color-accent-primary)",
    color: "#fff",
    fontWeight: 700,
  },
  resultCount: {
    fontSize: "12px",
    color: "var(--color-text-muted)",
  },
  tableWrapper: {
    flex: 1,
    overflow: "hidden",
    padding: "0 24px 24px",
    marginTop: "8px",
  },
};

const panelStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  panel: {
    width: "400px",
    height: "100%",
    background: "var(--color-bg-secondary)",
    borderLeft: "1px solid var(--color-border)",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  shirtNumber: {
    width: "52px",
    height: "52px",
    borderRadius: "var(--radius-md)",
    background: "var(--color-bg-hover)",
    border: "2px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: 900,
    color: "var(--color-accent-primary)",
    flexShrink: 0,
  },
  name: {
    fontSize: "18px",
    fontWeight: 800,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "var(--color-text-secondary)",
    marginTop: "4px",
  },
  closeBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px",
  },
  abilityRow: {
    display: "flex",
    gap: "12px",
  },
  abilityBox: {
    flex: 1,
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  abilityLabel: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  abilityValue: {
    fontSize: "28px",
    fontWeight: 900,
  },
  attrsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  attrRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  attrLabel: {
    width: "90px",
    fontSize: "12px",
    color: "var(--color-text-secondary)",
    flexShrink: 0,
  },
  attrBarOuter: {
    flex: 1,
    height: "8px",
    borderRadius: "4px",
    background: "var(--color-bg-hover)",
    overflow: "hidden",
  },
  attrBarInner: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s ease",
  },
  attrValue: {
    width: "28px",
    textAlign: "right",
    fontSize: "13px",
    fontWeight: 700,
    flexShrink: 0,
  },
  footerInfo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "auto",
    paddingTop: "16px",
    borderTop: "1px solid var(--color-border)",
    fontSize: "13px",
    color: "var(--color-text-primary)",
  },
  footerLabel: {
    color: "var(--color-text-muted)",
    fontSize: "11px",
    display: "block",
    marginBottom: "2px",
  },
};
