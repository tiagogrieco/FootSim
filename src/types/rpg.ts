// ========================================
// FootSim RPG — Card & RPG Type System
// ========================================

export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface CardTrait {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: TraitEffect;
}

export interface TraitEffect {
  stat?: string;       // attribute key to boost
  value?: number;      // flat bonus
  percent?: number;    // % bonus
  condition?: string;  // when it activates (e.g. "finals", "last_10_min")
}

export interface RPGData {
  rarity: CardRarity;
  level: number;
  xp: number;
  xpToNext: number;
  stars: number;        // 1-5, increased via fusion
  traits: CardTrait[];
  chemistry: number;    // 0-100, calculated from team links
}

// XP required to reach next level (exponential curve)
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.15, level - 1));
}

// Stars from fusion: each duplicate adds progress
export const MAX_STARS = 5;

// Rarity weights for pack generation
export const RARITY_CONFIG: Record<CardRarity, {
  color: string;
  glow: string;
  bgGradient: string;
  borderColor: string;
  label: string;
  minCA: number;
  maxCA: number;
  weight: number;       // probability weight in packs
}> = {
  common: {
    color: "#9ca3af",
    glow: "rgba(156, 163, 175, 0.2)",
    bgGradient: "linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)",
    borderColor: "#4b5563",
    label: "Comum",
    minCA: 30, maxCA: 55,
    weight: 50,
  },
  uncommon: {
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.25)",
    bgGradient: "linear-gradient(135deg, #0f2918 0%, #1a3a25 100%)",
    borderColor: "#16a34a",
    label: "Incomum",
    minCA: 50, maxCA: 65,
    weight: 30,
  },
  rare: {
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.3)",
    bgGradient: "linear-gradient(135deg, #0c1a3a 0%, #162d5a 100%)",
    borderColor: "#2563eb",
    label: "Raro",
    minCA: 60, maxCA: 75,
    weight: 13,
  },
  epic: {
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.35)",
    bgGradient: "linear-gradient(135deg, #1a0a2e 0%, #2d1650 100%)",
    borderColor: "#9333ea",
    label: "Épico",
    minCA: 72, maxCA: 85,
    weight: 5,
  },
  legendary: {
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.4)",
    bgGradient: "linear-gradient(135deg, #2a1a00 0%, #3d2800 50%, #2a1a00 100%)",
    borderColor: "#d97706",
    label: "Lendário",
    minCA: 82, maxCA: 99,
    weight: 2,
  },
};

// Pack types
export interface PackType {
  id: string;
  name: string;
  icon: string;
  cost: number;
  cardCount: number;
  guaranteedRarity: CardRarity;  // minimum rarity guaranteed
  description: string;
}

export const PACK_TYPES: PackType[] = [
  {
    id: "bronze",
    name: "Pack Bronze",
    icon: "🥉",
    cost: 50_000,
    cardCount: 3,
    guaranteedRarity: "common",
    description: "3 jogadores. Maioria comum.",
  },
  {
    id: "silver",
    name: "Pack Prata",
    icon: "🥈",
    cost: 150_000,
    cardCount: 5,
    guaranteedRarity: "uncommon",
    description: "5 jogadores. Mínimo 1 Incomum.",
  },
  {
    id: "gold",
    name: "Pack Ouro",
    icon: "🥇",
    cost: 400_000,
    cardCount: 5,
    guaranteedRarity: "rare",
    description: "5 jogadores. Mínimo 1 Raro.",
  },
  {
    id: "legendary",
    name: "Pack Lendário",
    icon: "💎",
    cost: 1_200_000,
    cardCount: 7,
    guaranteedRarity: "epic",
    description: "7 jogadores. Mínimo 1 Épico. Chance de Lendário!",
  },
];

// Predefined trait pool
export const TRAIT_POOL: CardTrait[] = [
  { id: "clutch", name: "Clutch Player", icon: "🎯", description: "+15% em finais e decisões", effect: { percent: 15, condition: "finals" } },
  { id: "iron_wall", name: "Muralha de Ferro", icon: "🛡️", description: "-20% gols sofridos quando titular", effect: { stat: "defending", value: 8 } },
  { id: "playmaker", name: "Maestro", icon: "🎼", description: "+10 passe, +5 dribles", effect: { stat: "passing", value: 10 } },
  { id: "speedster", name: "Velocista", icon: "⚡", description: "+12 velocidade", effect: { stat: "pace", value: 12 } },
  { id: "sniper", name: "Sniper", icon: "🔫", description: "+10 finalização", effect: { stat: "shooting", value: 10 } },
  { id: "tank", name: "Tanque", icon: "💪", description: "+10 físico, +5 defesa", effect: { stat: "physical", value: 10 } },
  { id: "wonderkid", name: "Joia Rara", icon: "💎", description: "+50% XP ganho", effect: { percent: 50, condition: "xp_gain" } },
  { id: "captain", name: "Capitão Nato", icon: "©️", description: "+5 chemistry para todo o time", effect: { value: 5, condition: "chemistry" } },
  { id: "fox_in_box", name: "Raposa na Área", icon: "🦊", description: "+15 finalização dentro da área", effect: { stat: "shooting", value: 15, condition: "box" } },
  { id: "long_shot", name: "Canhão", icon: "💥", description: "Chance de golaço de fora da área", effect: { stat: "shooting", value: 8, condition: "long_range" } },
  { id: "acrobat", name: "Acrobata", icon: "🤸", description: "+8 dribles, fintas especiais", effect: { stat: "dribbling", value: 8 } },
  { id: "brick", name: "Zagueirão", icon: "🧱", description: "+12 defesa em jogadas aéreas", effect: { stat: "defending", value: 12, condition: "aerial" } },
];

// How many traits a card gets based on rarity
export function traitsForRarity(rarity: CardRarity): number {
  switch (rarity) {
    case "common": return 0;
    case "uncommon": return 1;
    case "rare": return 1;
    case "epic": return 2;
    case "legendary": return 3;
  }
}

// Chemistry nationality bonuses
export const CHEMISTRY_NATION_BONUS = 5;
export const CHEMISTRY_LEAGUE_BONUS = 3;
export const CHEMISTRY_PERFECT = 100;
