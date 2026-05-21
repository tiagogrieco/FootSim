// ========================================
// PlayerCard — RPG Card Component
// Estilo FIFA Ultimate Team com raridades
// ========================================

import { type CSSProperties } from "react";
import type { Player } from "../types/game";
import { RARITY_CONFIG, type CardRarity } from "../types/rpg";
import { getPositionCategory, getAttrColor } from "../types/game";

interface PlayerCardProps {
  player: Player;
  onClick?: (player: Player) => void;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  showStats?: boolean;
}

const FLAG_MAP: Record<string, string> = {
  "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Portugal": "🇵🇹", "Spain": "🇪🇸",
  "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹", "England": "🇬🇧",
  "Netherlands": "🇳🇱", "Colombia": "🇨🇴", "Uruguay": "🇺🇾", "Belgium": "🇧🇪",
  "Croatia": "🇭🇷", "Mexico": "🇲🇽", "Japan": "🇯🇵", "South Korea": "🇰🇷",
  "Nigeria": "🇳🇬", "Ghana": "🇬🇭", "Senegal": "🇸🇳", "Chile": "🇨🇱",
};

const POS_ICON: Record<string, string> = {
  GK: "🧤", DEF: "🛡️", MID: "🎯", FWD: "⚡",
};

const SIZES = {
  sm: { width: 140, height: 195, fontSize: 10, attrFont: 9, nameFont: 11 },
  md: { width: 180, height: 250, fontSize: 11, attrFont: 10, nameFont: 13 },
  lg: { width: 220, height: 310, fontSize: 12, attrFont: 11, nameFont: 15 },
};

export default function PlayerCard({ player, onClick, size = "md", selected, showStats = true }: PlayerCardProps) {
  const rpg = player.rpg;
  const rarity: CardRarity = rpg?.rarity ?? "common";
  const config = RARITY_CONFIG[rarity];
  const posCategory = getPositionCategory(player.position);
  const s = SIZES[size];

  const stars = rpg?.stars ?? 1;
  const level = rpg?.level ?? 1;
  const xp = rpg?.xp ?? 0;
  const xpToNext = rpg?.xpToNext ?? 100;
  const traits = rpg?.traits ?? [];

  const cardStyle: CSSProperties = {
    width: s.width,
    height: s.height,
    background: config.bgGradient,
    border: `2px solid ${config.borderColor}`,
    borderRadius: 12,
    position: "relative",
    cursor: onClick ? "pointer" : "default",
    overflow: "hidden",
    transition: "all 0.3s ease",
    boxShadow: selected
      ? `0 0 24px ${config.glow}, 0 0 48px ${config.glow}`
      : `0 4px 20px rgba(0,0,0,0.4)`,
    transform: selected ? "scale(1.05)" : "scale(1)",
  };

  return (
    <div
      className={`player-card player-card-${rarity}`}
      style={cardStyle}
      onClick={() => onClick?.(player)}
      title={`${player.name} — ${config.label}`}
    >
      {/* Shimmer overlay for epic+ */}
      {(rarity === "epic" || rarity === "legendary") && (
        <div className="card-shimmer" />
      )}

      {/* Top bar: CA + Position */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 10px 4px",
      }}>
        <div style={{
          fontSize: s.nameFont + 6, fontWeight: 900, color: config.color,
          lineHeight: 1, textShadow: `0 0 12px ${config.glow}`,
        }}>
          {player.currentAbility}
        </div>
        <div style={{
          fontSize: s.attrFont, fontWeight: 700, color: config.color,
          background: `${config.color}15`, padding: "2px 6px", borderRadius: 4,
        }}>
          {player.position}
        </div>
      </div>

      {/* Status Overlay Row */}
      {((player.injuryDays ?? 0) > 0 || (player.strikeDays ?? 0) > 0 || (player.playtimePromiseMatches ?? 0) > 0) && (
        <div style={{
          position: "absolute",
          top: "36px",
          right: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          zIndex: 10
        }}>
          {(player.injuryDays ?? 0) > 0 && (
            <div style={{ background: "rgba(239, 68, 68, 0.9)", color: "#fff", width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }} title={`Lesionado (${player.injuryDays} dias)`}>🏥</div>
          )}
          {(player.strikeDays ?? 0) > 0 && (
            <div style={{ background: "rgba(220, 38, 38, 0.9)", color: "#fff", width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }} title={`EM GREVE (${player.strikeDays} dias)`}>✊</div>
          )}
          {(player.playtimePromiseMatches ?? 0) > 0 && (
            <div style={{ background: "rgba(245, 158, 11, 0.9)", color: "#fff", width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }} title="Promessa de tempo de jogo ativa">🤝</div>
          )}
        </div>
      )}

      {/* Player icon area */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: size === "sm" ? 50 : size === "md" ? 65 : 80,
        fontSize: size === "sm" ? 36 : size === "md" ? 48 : 60,
      }}>
        {POS_ICON[posCategory]}
      </div>

      {/* Name + Nationality */}
      <div style={{ textAlign: "center", padding: "2px 8px" }}>
        <div style={{
          fontSize: s.nameFont, fontWeight: 800, color: "#e8edf5",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          letterSpacing: "-0.3px",
        }}>
          {player.name}
        </div>
        <div style={{
          fontSize: s.attrFont, color: "#8b9bb4",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          <span>{FLAG_MAP[player.nationality] ?? "🏳️"}</span>
          <span>{player.age} anos</span>
        </div>
      </div>

      {/* Stars */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 2, padding: "2px 0",
        fontSize: size === "sm" ? 8 : 10,
      }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ opacity: i < stars ? 1 : 0.2, filter: i < stars ? "none" : "grayscale(1)" }}>
            ⭐
          </span>
        ))}
      </div>

      {/* Attribute bars (compact) */}
      {showStats && (
        <div style={{ padding: "4px 10px 2px", display: "flex", flexDirection: "column", gap: 2 }}>
          {(["pace", "shooting", "passing", "dribbling", "defending", "physical"] as const).map(attr => {
            const val = player.attributes[attr];
            return (
              <div key={attr} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  fontSize: s.attrFont - 1, color: "#8b9bb4", width: 26,
                  textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.3px",
                }}>
                  {attr.slice(0, 3)}
                </span>
                <div style={{
                  flex: 1, height: 3, background: "rgba(255,255,255,0.08)",
                  borderRadius: 2, overflow: "hidden",
                }}>
                  <div style={{
                    width: `${val}%`, height: "100%",
                    background: getAttrColor(val), borderRadius: 2,
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <span style={{
                  fontSize: s.attrFont - 1, fontWeight: 700,
                  color: getAttrColor(val), width: 18, textAlign: "right",
                }}>
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* XP bar at bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 3, background: "rgba(255,255,255,0.05)",
      }}>
        <div style={{
          width: `${Math.round((xp / xpToNext) * 100)}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Level badge */}
      <div style={{
        position: "absolute", top: 6, right: 6,
        fontSize: s.attrFont - 1, fontWeight: 800,
        color: config.color, background: "rgba(0,0,0,0.5)",
        padding: "1px 5px", borderRadius: 4,
        border: `1px solid ${config.borderColor}40`,
      }}>
        Lv.{level}
      </div>

      {/* Traits icons (bottom-left) */}
      {traits.length > 0 && (
        <div style={{
          position: "absolute", bottom: 6, left: 6,
          display: "flex", gap: 2,
        }}>
          {traits.map(t => (
            <span key={t.id} title={`${t.name}: ${t.description}`}
              style={{ fontSize: size === "sm" ? 10 : 12, cursor: "help" }}>
              {t.icon}
            </span>
          ))}
        </div>
      )}

      {/* Rarity label */}
      <div style={{
        position: "absolute", bottom: 6, right: 6,
        fontSize: s.attrFont - 2, fontWeight: 700,
        color: config.color, opacity: 0.6,
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {config.label}
      </div>
    </div>
  );
}
