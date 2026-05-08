import { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import type { Player, Position } from "../types/game";
import { getAttrColor } from "../types/game";

type Formation = "4-2-3-1" | "4-3-3" | "4-4-2" | "3-5-2" | "4-1-4-1";

interface PitchSlot {
  position: Position;
  x: number; // % from left
  y: number; // % from top
}

const FORMATIONS: Record<Formation, PitchSlot[]> = {
  "4-2-3-1": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "CDM", x: 38, y: 55 },
    { position: "CDM", x: 62, y: 55 },
    { position: "LW", x: 18, y: 35 },
    { position: "CAM", x: 50, y: 38 },
    { position: "RW", x: 82, y: 35 },
    { position: "ST", x: 50, y: 15 },
  ],
  "4-3-3": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "CM", x: 30, y: 52 },
    { position: "CDM", x: 50, y: 58 },
    { position: "CM", x: 70, y: 52 },
    { position: "LW", x: 20, y: 25 },
    { position: "ST", x: 50, y: 18 },
    { position: "RW", x: 80, y: 25 },
  ],
  "4-4-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "LM", x: 18, y: 50 },
    { position: "CM", x: 38, y: 52 },
    { position: "CM", x: 62, y: 52 },
    { position: "RM", x: 82, y: 50 },
    { position: "ST", x: 38, y: 20 },
    { position: "ST", x: 62, y: 20 },
  ],
  "3-5-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "CB", x: 28, y: 75 },
    { position: "CB", x: 50, y: 78 },
    { position: "CB", x: 72, y: 75 },
    { position: "LM", x: 12, y: 50 },
    { position: "CM", x: 35, y: 52 },
    { position: "CDM", x: 50, y: 58 },
    { position: "CM", x: 65, y: 52 },
    { position: "RM", x: 88, y: 50 },
    { position: "ST", x: 38, y: 20 },
    { position: "ST", x: 62, y: 20 },
  ],
  "4-1-4-1": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "CDM", x: 50, y: 60 },
    { position: "LW", x: 18, y: 40 },
    { position: "CM", x: 38, y: 45 },
    { position: "CM", x: 62, y: 45 },
    { position: "RW", x: 82, y: 40 },
    { position: "ST", x: 50, y: 18 },
  ],
};

const MENTALITIES = [
  { value: "defensive", label: "Defensiva", icon: "🛡️", color: "#3b82f6" },
  { value: "balanced", label: "Equilibrada", icon: "⚖️", color: "#f59e0b" },
  { value: "attacking", label: "Ofensiva", icon: "⚔️", color: "#ef4444" },
] as const;

function getBestPlayerForSlot(players: Player[], position: Position, usedIds: Set<number>): Player | null {
  const availablePlayers = players.filter(p => !usedIds.has(p.id) && (!p.injuryDays || p.injuryDays <= 0));

  const candidates = availablePlayers
    .filter(p => p.position === position)
    .sort((a, b) => b.currentAbility - a.currentAbility);

  if (candidates.length > 0) return candidates[0];

  // Fallback: same position category
  const category =
    position === "GK" ? "GK" :
    ["CB", "LB", "RB"].includes(position) ? "DEF" :
    ["CDM", "CM", "CAM", "LM", "RM"].includes(position) ? "MID" : "FWD";

  const fallback = availablePlayers
    .filter(p => p.positionCategory === category)
    .sort((a, b) => b.currentAbility - a.currentAbility);

  return fallback[0] || null;
}

export default function TacticsView() {
  const { playerSquad, playerClub, updateStartingLineup } = useGame();
  const [formation, setFormation] = useState<Formation>(
    (playerClub.formation as Formation) || "4-2-3-1"
  );
  const [mentality, setMentality] = useState(playerClub.mentality);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const slots = FORMATIONS[formation];

  // Auto-assign best players to slots and sync with context
  const lineup = useMemo(() => {
    const usedIds = new Set<number>();
    
    return slots.map((slot, index) => {
      let player: Player | null = null;
      
      // Try to use the saved player for this slot
      if (playerClub.startingLineup && playerClub.startingLineup[index]) {
         const savedPlayer = playerSquad.find(p => p.id === playerClub.startingLineup![index]);
         // Only use if not injured and not already used
         if (savedPlayer && (!savedPlayer.injuryDays || savedPlayer.injuryDays <= 0) && !usedIds.has(savedPlayer.id)) {
           player = savedPlayer;
         }
      }
      
      // Fallback: auto-assign
      if (!player) {
         player = getBestPlayerForSlot(playerSquad, slot.position, usedIds);
      }
      
      if (player) usedIds.add(player.id);
      return { slot, player };
    });
  }, [playerSquad, slots, playerClub.startingLineup]);

  const handleSlotClick = (index: number) => {
    if (selectedSlot === null) {
      setSelectedSlot(index);
    } else if (selectedSlot === index) {
      setSelectedSlot(null); // Deselect
    } else {
      // Swap two lineup slots
      const currentIds = lineup.map(l => l.player?.id || 0);
      const temp = currentIds[selectedSlot];
      currentIds[selectedSlot] = currentIds[index];
      currentIds[index] = temp;
      updateStartingLineup(currentIds);
      setSelectedSlot(null);
    }
  };

  const handleBenchClick = (player: Player) => {
    if (selectedSlot !== null) {
      // Swap selected lineup slot with bench player
      const currentIds = lineup.map(l => l.player?.id || 0);
      currentIds[selectedSlot] = player.id;
      updateStartingLineup(currentIds);
      setSelectedSlot(null);
    }
  };

  const bench = useMemo(() => {
    const lineupIds = new Set(lineup.map(l => l.player?.id).filter(Boolean));
    return playerSquad.filter(p => !lineupIds.has(p.id));
  }, [playerSquad, lineup]);

  const avgCA = lineup.reduce((s, l) => s + (l.player?.currentAbility || 0), 0) / 11;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>📋 Táticas</h1>
        <div style={styles.headerRight}>
          <span style={styles.avgLabel}>Força do XI: </span>
          <span style={{ fontSize: "20px", fontWeight: 900, color: getAttrColor(avgCA) }}>
            {Math.round(avgCA)}
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {/* Left: Pitch */}
        <div style={styles.pitchContainer}>
          {/* Formation selector */}
          <div style={styles.formationBar}>
            {(Object.keys(FORMATIONS) as Formation[]).map(f => (
              <button
                key={f}
                onClick={() => setFormation(f)}
                style={{
                  ...styles.formBtn,
                  ...(formation === f ? styles.formBtnActive : {}),
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Pitch */}
          <div style={styles.pitch}>
            {/* Pitch markings */}
            <div style={styles.pitchLines}>
              <div style={styles.centerCircle} />
              <div style={styles.centerLine} />
              <div style={styles.penaltyAreaTop} />
              <div style={styles.penaltyAreaBottom} />
              <div style={styles.goalAreaTop} />
              <div style={styles.goalAreaBottom} />
            </div>

            {/* Players on pitch */}
            {lineup.map((item, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: `${item.slot.x}%`,
                  top: `${item.slot.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                  cursor: "pointer",
                }}
                onClick={() => handleSlotClick(index)}
              >
                <div style={{
                  ...styles.playerDot,
                  ...(selectedSlot === index ? styles.playerDotSelected : {}),
                  background: item.player
                    ? `linear-gradient(135deg, ${getAttrColor(item.player.currentAbility)}, ${getAttrColor(item.player.currentAbility)}88)`
                    : "rgba(100,100,100,0.5)",
                }}>
                  <span style={styles.dotNumber}>
                    {item.player?.shirtNumber || "?"}
                  </span>
                </div>
                <div style={styles.playerLabel}>
                  <span style={styles.playerName}>
                    {item.player ? item.player.name.split(" ").pop() : "Vazio"}
                  </span>
                  <span style={styles.playerPos}>{item.slot.position}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mentality */}
          <div style={styles.mentalityBar}>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Mentalidade:</span>
            {MENTALITIES.map(m => (
              <button
                key={m.value}
                onClick={() => setMentality(m.value)}
                style={{
                  ...styles.mentalBtn,
                  ...(mentality === m.value ? { background: m.color, color: "#fff", borderColor: m.color } : {}),
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Bench + Selected Player */}
        <div style={styles.rightPanel}>
          {/* Selected player info */}
          {selectedSlot !== null && lineup[selectedSlot]?.player && (
            <div className="card" style={styles.selectedCard}>
              <h3 style={styles.sectionTitle}>⭐ Jogador Selecionado</h3>
              <div style={styles.selectedInfo}>
                <div style={styles.selectedHeader}>
                  <span style={styles.selectedNum}>{lineup[selectedSlot].player!.shirtNumber}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{lineup[selectedSlot].player!.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      {lineup[selectedSlot].player!.position} • {lineup[selectedSlot].player!.age} anos
                    </div>
                  </div>
                  <span style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: getAttrColor(lineup[selectedSlot].player!.currentAbility),
                    marginLeft: "auto",
                  }}>
                    {lineup[selectedSlot].player!.currentAbility}
                  </span>
                </div>
                <div style={styles.miniAttrs}>
                  {(["pace", "shooting", "passing", "dribbling", "defending", "physical"] as const).map(attr => (
                    <div key={attr} style={styles.miniAttr}>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                        {attr.slice(0, 3)}
                      </span>
                      <span style={{ fontWeight: 700, color: getAttrColor(lineup[selectedSlot].player!.attributes[attr]) }}>
                        {lineup[selectedSlot].player!.attributes[attr]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bench */}
          <div className="card" style={styles.benchCard}>
            <h3 style={styles.sectionTitle}>🪑 Reservas ({bench.length})</h3>
            <div style={styles.benchList}>
              {bench.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleBenchClick(p)}
                  style={{
                    ...styles.benchPlayer,
                    opacity: (p.injuryDays ?? 0) > 0 ? 0.6 : 1,
                    cursor: selectedSlot !== null ? "pointer" : "default",
                    background: selectedSlot !== null ? "var(--color-bg-hover)" : "transparent"
                  }}
                >
                  <span style={styles.benchNum}>{p.shirtNumber}</span>
                  <span style={{ flex: 1, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                    {(p.injuryDays ?? 0) > 0 && <span title={`Lesionado (${p.injuryDays} dias)`}>🏥</span>}
                    {p.name}
                  </span>
                  <span style={{
                    ...styles.benchBadge,
                    background: p.positionCategory === "GK" ? "#f59e0b" :
                      p.positionCategory === "DEF" ? "#3b82f6" :
                      p.positionCategory === "MID" ? "#10b981" : "#ef4444",
                  }}>{p.position}</span>
                  <span style={{
                    fontWeight: 700,
                    fontSize: "12px",
                    color: getAttrColor(p.currentAbility),
                    width: "28px",
                    textAlign: "right",
                  }}>{p.currentAbility}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", height: "100%", overflow: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title: { fontSize: "24px", fontWeight: 800 },
  headerRight: { display: "flex", alignItems: "center", gap: "8px" },
  avgLabel: { fontSize: "13px", color: "var(--color-text-muted)" },
  content: { display: "flex", gap: "20px", height: "calc(100% - 70px)" },

  pitchContainer: { flex: "0 0 520px", display: "flex", flexDirection: "column", gap: "12px" },
  formationBar: { display: "flex", gap: "6px" },
  formBtn: {
    padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
  },
  formBtnActive: {
    background: "var(--color-accent-primary)", borderColor: "var(--color-accent-primary)", color: "#fff",
  },

  pitch: {
    position: "relative",
    width: "520px",
    height: "680px",
    borderRadius: "12px",
    background: "linear-gradient(180deg, #1a472a 0%, #1d5631 25%, #1a472a 50%, #1d5631 75%, #1a472a 100%)",
    border: "3px solid rgba(255,255,255,0.15)",
    overflow: "hidden",
  },

  pitchLines: { position: "absolute", inset: 0, pointerEvents: "none" },
  centerCircle: {
    position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
    width: "100px", height: "100px", borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
  },
  centerLine: {
    position: "absolute", left: "5%", right: "5%", top: "50%",
    height: "2px", background: "rgba(255,255,255,0.2)",
  },
  penaltyAreaTop: {
    position: "absolute", left: "25%", right: "25%", top: 0,
    height: "18%", borderBottom: "2px solid rgba(255,255,255,0.2)",
    borderLeft: "2px solid rgba(255,255,255,0.2)",
    borderRight: "2px solid rgba(255,255,255,0.2)",
  },
  penaltyAreaBottom: {
    position: "absolute", left: "25%", right: "25%", bottom: 0,
    height: "18%", borderTop: "2px solid rgba(255,255,255,0.2)",
    borderLeft: "2px solid rgba(255,255,255,0.2)",
    borderRight: "2px solid rgba(255,255,255,0.2)",
  },
  goalAreaTop: {
    position: "absolute", left: "38%", right: "38%", top: 0,
    height: "8%", borderBottom: "2px solid rgba(255,255,255,0.2)",
    borderLeft: "2px solid rgba(255,255,255,0.2)",
    borderRight: "2px solid rgba(255,255,255,0.2)",
  },
  goalAreaBottom: {
    position: "absolute", left: "38%", right: "38%", bottom: 0,
    height: "8%", borderTop: "2px solid rgba(255,255,255,0.2)",
    borderLeft: "2px solid rgba(255,255,255,0.2)",
    borderRight: "2px solid rgba(255,255,255,0.2)",
  },

  playerDot: {
    width: "42px", height: "42px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "2px solid rgba(255,255,255,0.4)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    transition: "all 0.2s ease",
  },
  playerDotSelected: {
    border: "3px solid #fff",
    boxShadow: "0 0 16px rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.4)",
    transform: "scale(1.15)",
  },
  dotNumber: { color: "#fff", fontWeight: 900, fontSize: "14px", textShadow: "0 1px 3px rgba(0,0,0,0.6)" },

  playerLabel: {
    display: "flex", flexDirection: "column", alignItems: "center", marginTop: "3px",
  },
  playerName: {
    fontSize: "10px", fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)",
    maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  playerPos: {
    fontSize: "8px", color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase",
  },

  mentalityBar: { display: "flex", alignItems: "center", gap: "8px" },
  mentalBtn: {
    padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600,
    background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
  },

  rightPanel: { flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflow: "auto" },

  selectedCard: { padding: "16px" },
  sectionTitle: { fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "var(--color-text-secondary)" },
  selectedInfo: { display: "flex", flexDirection: "column", gap: "12px" },
  selectedHeader: { display: "flex", alignItems: "center", gap: "12px" },
  selectedNum: {
    width: "40px", height: "40px", borderRadius: "8px",
    background: "var(--color-bg-hover)", border: "1px solid var(--color-border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "18px", fontWeight: 900, color: "var(--color-accent-primary)",
  },
  miniAttrs: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" },
  miniAttr: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
    padding: "6px 4px", background: "var(--color-bg-hover)", borderRadius: "6px",
  },

  benchCard: { padding: "16px", flex: 1, overflow: "auto" },
  benchList: { display: "flex", flexDirection: "column", gap: "4px" },
  benchPlayer: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "6px 8px", borderRadius: "4px", transition: "background 0.15s",
  },
  benchNum: { width: "24px", fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textAlign: "center" },
  benchBadge: {
    fontSize: "9px", fontWeight: 800, color: "#fff", padding: "2px 6px",
    borderRadius: "3px", textTransform: "uppercase",
  },
};
