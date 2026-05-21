import { useState, useMemo } from "react";
import { useHallOfFame } from "../context/HallOfFameContext";
import type { Trophy, ClubRecord, LegendStats } from "../types/hallOfFame";

type Tab = "trophies" | "records" | "legends";

const RARITY_STYLE = {
  bronze:   { color: "#cd7f32", glow: "rgba(205,127,50,0.5)",  bg: "linear-gradient(180deg, #78350f, #422006)" },
  silver:   { color: "#cbd5e1", glow: "rgba(203,213,225,0.5)", bg: "linear-gradient(180deg, #475569, #1e293b)" },
  gold:     { color: "#fbbf24", glow: "rgba(251,191,36,0.6)",  bg: "linear-gradient(180deg, #a16207, #422006)" },
  platinum: { color: "#a78bfa", glow: "rgba(167,139,250,0.65)",bg: "linear-gradient(180deg, #4c1d95, #1e1b4b)" },
};

export default function HallOfFamePage() {
  const { currentClubHoF } = useHallOfFame();
  const [tab, setTab] = useState<Tab>("trophies");

  if (!currentClubHoF) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
        Carregando Hall of Fame...
      </div>
    );
  }

  const trophyCount = currentClubHoF.trophies.length;
  const recordCount = Object.keys(currentClubHoF.records).length;
  const legendCount = Object.values(currentClubHoF.legends).filter(l => l.isLegend).length;

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(124,58,237,0.12), rgba(0,0,0,0.4))",
        border: "1px solid rgba(245,158,11,0.3)",
        borderRadius: 16, padding: 24, marginBottom: 20,
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div className="hof-shimmer" style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
          animation: "cardShine 5s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fbbf24", letterSpacing: "-1px", textShadow: "0 0 20px rgba(245,158,11,0.4)" }}>
          🏛️ Hall of Fame
        </h1>
        <p style={{ fontSize: 13, color: "#fcd34d", marginTop: 6, fontWeight: 600, letterSpacing: 1 }}>
          {currentClubHoF.clubName.toUpperCase()}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 30, marginTop: 18 }}>
          <Stat label="Troféus" value={trophyCount} color="#fbbf24" />
          <Stat label="Recordes" value={recordCount} color="#a78bfa" />
          <Stat label="Lendas" value={legendCount} color="#10b981" />
          <Stat label="Jogos" value={currentClubHoF.totalMatches} color="#3b82f6" />
          <Stat label="Vitórias" value={currentClubHoF.totalWins} color="#10b981" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {([
          ["trophies", `🏆 Sala de Troféus (${trophyCount})`],
          ["records", `📊 Recordes (${recordCount})`],
          ["legends", `🌟 Lendas (${legendCount})`],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800,
            cursor: "pointer", fontFamily: "var(--font-sans)",
            background: tab === k ? "linear-gradient(135deg, #f59e0b, #d97706)" : "var(--color-bg-card)",
            color: tab === k ? "#fff" : "var(--color-text-secondary)",
            border: `1px solid ${tab === k ? "#fbbf24" : "var(--color-border)"}`,
            boxShadow: tab === k ? "0 4px 14px rgba(245,158,11,0.35)" : "none",
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "trophies" && <TrophiesGallery trophies={currentClubHoF.trophies} />}
      {tab === "records" && <RecordsBoard records={currentClubHoF.records} />}
      {tab === "legends" && <LegendsList legends={Object.values(currentClubHoF.legends)} />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "var(--font-mono)", textShadow: `0 0 12px ${color}66` }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function TrophiesGallery({ trophies }: { trophies: Trophy[] }) {
  const grouped = useMemo(() => {
    const m = new Map<number, Trophy[]>();
    for (const t of trophies) {
      const arr = m.get(t.season) ?? [];
      arr.push(t);
      m.set(t.season, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[0] - a[0]);
  }, [trophies]);

  if (trophies.length === 0) {
    return (
      <div style={{
        padding: 60, textAlign: "center", color: "var(--color-text-muted)",
        background: "rgba(0,0,0,0.3)", borderRadius: 12,
      }}>
        <div style={{ fontSize: 64, marginBottom: 12, opacity: 0.4 }}>🏆</div>
        <div style={{ fontSize: 14 }}>Sala vazia. Ganhe um título para abrir a coleção!</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {grouped.map(([season, list]) => (
        <div key={season}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: "#fbbf24" }}>TEMPORADA {season}</div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(245,158,11,0.3), transparent)" }} />
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 14,
          }}>
            {list.map(t => <TrophyCard key={t.id} trophy={t} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrophyCard({ trophy }: { trophy: Trophy }) {
  const s = RARITY_STYLE[trophy.rarity];
  return (
    <div style={{
      background: s.bg,
      border: `2px solid ${s.color}`,
      borderRadius: 12, padding: 18,
      textAlign: "center", position: "relative",
      boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 30px ${s.glow}`,
      overflow: "hidden",
      transition: "transform 0.3s ease",
    }}
    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px) scale(1.03)"}
    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0) scale(1)"}
    >
      <div className="card-shimmer" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
        backgroundSize: "200% 100%",
        animation: "cardShine 4s ease-in-out infinite",
      }} />
      <div style={{
        fontSize: 64, filter: `drop-shadow(0 0 14px ${s.color})`,
        marginBottom: 8, animation: "rarityFloat 4s ease-in-out infinite",
      }}>{trophy.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{trophy.name}</div>
      <div style={{ fontSize: 10, color: s.color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
        {trophy.rarity}
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
        Temporada {trophy.season}
      </div>
    </div>
  );
}

const RECORD_ORDER: (keyof typeof RECORD_LABELS)[] = [
  "biggest_win", "biggest_loss", "most_goals_match",
  "longest_unbeaten", "longest_win_streak",
  "most_goals_season", "most_clean_sheets_season",
];
const RECORD_LABELS = {
  biggest_win: "💥 Maior Goleada",
  biggest_loss: "💀 Maior Derrota",
  most_goals_match: "⚽ Mais Gols em uma Partida",
  longest_unbeaten: "🛡️ Maior Invencibilidade",
  longest_win_streak: "🔥 Maior Sequência de Vitórias",
  most_goals_match_player: "🎯 Mais Gols (Jogador, partida)",
  most_goals_season: "🎯 Artilheiro da Temporada",
  most_clean_sheets_season: "🧤 Mais Clean Sheets (Temporada)",
  top_scorer_career: "👑 Artilheiro Histórico",
  most_apps_career: "📊 Mais Jogos Pelo Clube",
  most_motm_career: "⭐ Mais MOTMs",
};

function RecordsBoard({ records }: { records: Record<string, ClubRecord | undefined> }) {
  const entries = RECORD_ORDER
    .map(k => [k, records[k]] as const)
    .filter(([, v]) => v != null) as [string, ClubRecord][];

  if (entries.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📊</div>
        Nenhum recorde registrado ainda. Jogue partidas!
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
      {entries.map(([k, r]) => (
        <div key={k} className="card" style={{
          padding: 16, display: "flex", gap: 14, alignItems: "center",
          borderLeft: "3px solid #a78bfa",
          background: "linear-gradient(135deg, rgba(124,58,237,0.08), transparent)",
        }}>
          <div style={{ fontSize: 36 }}>{r.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", letterSpacing: 0.5, textTransform: "uppercase" }}>
              {RECORD_LABELS[k as keyof typeof RECORD_LABELS] ?? r.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.1, marginTop: 2 }}>
              {r.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
              {r.detail} · T{r.season}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LegendsList({ legends }: { legends: LegendStats[] }) {
  const sorted = [...legends]
    .filter(l => l.apps >= 1)
    .sort((a, b) => Number(b.isLegend) - Number(a.isLegend) || b.goals + b.apps * 0.3 - (a.goals + a.apps * 0.3));

  if (sorted.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🌟</div>
        Nenhum jogador na história ainda. Faça história!
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {sorted.map(l => (
        <div key={l.playerId} style={{
          padding: 14, borderRadius: 12,
          background: l.isLegend
            ? "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(124,58,237,0.10))"
            : "var(--color-bg-card)",
          border: `1.5px solid ${l.isLegend ? "#fbbf24" : "var(--color-border)"}`,
          boxShadow: l.isLegend ? "0 0 24px rgba(251,191,36,0.25)" : "none",
          position: "relative",
        }}>
          {l.isLegend && (
            <div style={{
              position: "absolute", top: -8, right: 10,
              padding: "2px 8px", borderRadius: 6,
              background: "linear-gradient(135deg, #fbbf24, #d97706)",
              fontSize: 9, fontWeight: 900, color: "#000",
              letterSpacing: 0.5, textTransform: "uppercase",
              boxShadow: "0 2px 8px rgba(251,191,36,0.5)",
            }}>
              👑 LENDA
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800,
              color: l.isLegend ? "#fbbf24" : "var(--color-text-secondary)",
            }}>
              {l.position}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 800, color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{l.name}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                T{l.firstSeason}–{l.lastSeason}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            <MiniStat label="Jogos" value={l.apps} />
            <MiniStat label="Gols" value={l.goals} highlight={l.goals >= 30} />
            <MiniStat label="Assist" value={l.assists} />
            <MiniStat label="MOTM" value={l.motm} highlight={l.motm >= 8} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      padding: "6px 4px", borderRadius: 6,
      background: highlight ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.03)",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: 14, fontWeight: 900,
        color: highlight ? "#fbbf24" : "var(--color-text-primary)",
        fontFamily: "var(--font-mono)",
      }}>{value}</div>
      <div style={{ fontSize: 8, color: "var(--color-text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
