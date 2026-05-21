// ========================================
// FootSim RPG — Core RPG Engine
// Pure functions, no side-effects
// ========================================

import type { Player, PlayerAttributes } from "../types/game";
import {
  type CardRarity,
  type RPGData,
  RARITY_CONFIG,
  TRAIT_POOL,
  xpForLevel,
  traitsForRarity,
  MAX_STARS,
  CHEMISTRY_NATION_BONUS,
  CHEMISTRY_LEAGUE_BONUS,
  CHEMISTRY_PERFECT,
} from "../types/rpg";

// ── Rarity Assignment ──────────────────────────

export function assignRarity(ca: number): CardRarity {
  if (ca >= 82) return "legendary";
  if (ca >= 72) return "epic";
  if (ca >= 60) return "rare";
  if (ca >= 50) return "uncommon";
  return "common";
}

// ── Initialize RPG data for a player ──────────

export function initRPGData(ca: number, overrideRarity?: CardRarity): RPGData {
  const rarity = overrideRarity ?? assignRarity(ca);
  const traitCount = traitsForRarity(rarity);
  const shuffled = [...TRAIT_POOL].sort(() => Math.random() - 0.5);
  const traits = shuffled.slice(0, traitCount);

  return {
    rarity,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    stars: 1,
    traits,
    chemistry: 0,
  };
}

// ── XP & Level Up ──────────────────────────────

export interface LevelUpResult {
  rpg: RPGData;
  levelsGained: number;
  pointsToDistribute: number; // each level = 2 attribute points
}

export function addXP(rpg: RPGData, xpGained: number): LevelUpResult {
  const updated = { ...rpg };
  let gained = 0;

  // Check for wonderkid trait → 50% bonus XP
  const hasWonderkid = updated.traits.some(t => t.id === "wonderkid");
  const totalXP = hasWonderkid ? Math.round(xpGained * 1.5) : xpGained;

  updated.xp += totalXP;

  while (updated.xp >= updated.xpToNext && updated.level < 99) {
    updated.xp -= updated.xpToNext;
    updated.level += 1;
    updated.xpToNext = xpForLevel(updated.level);
    gained += 1;
  }

  return {
    rpg: updated,
    levelsGained: gained,
    pointsToDistribute: gained * 2,
  };
}

// ── Match XP Calculation ──────────────────────

export function calculateMatchXP(
  rating: number,       // 0-10 match rating
  isStarter: boolean,
  goals: number,
  assists: number,
  isMotM: boolean,
): number {
  let xp = 10; // base for participation

  if (isStarter) xp += 15;
  xp += Math.round(rating * 5);          // 0-50 from rating
  xp += goals * 20;
  xp += assists * 12;
  if (isMotM) xp += 30;

  return xp;
}

// ── Distribute Level Up Points ────────────────

export function distributePoints(
  attrs: PlayerAttributes,
  distribution: Partial<Record<keyof PlayerAttributes, number>>,
): PlayerAttributes {
  const updated = { ...attrs };
  for (const [key, pts] of Object.entries(distribution)) {
    const k = key as keyof PlayerAttributes;
    updated[k] = Math.min(99, updated[k] + (pts ?? 0));
  }
  return updated;
}

// ── Card Fusion (Merge duplicates) ────────────

export interface FusionResult {
  rpg: RPGData;
  bonusCA: number;  // flat CA bonus from star increase
}

export function fuseCards(base: RPGData): FusionResult {
  if (base.stars >= MAX_STARS) {
    return { rpg: base, bonusCA: 0 };
  }

  const updated = { ...base };
  updated.stars += 1;
  const bonusCA = updated.stars * 2; // each star = +2 base CA

  // At 3 and 5 stars, gain an extra trait
  if (updated.stars === 3 || updated.stars === 5) {
    const existingIds = new Set(updated.traits.map(t => t.id));
    const available = TRAIT_POOL.filter(t => !existingIds.has(t.id));
    if (available.length > 0) {
      const newTrait = available[Math.floor(Math.random() * available.length)];
      updated.traits = [...updated.traits, newTrait];
    }
  }

  return { rpg: updated, bonusCA };
}

// ── Chemistry Calculation ─────────────────────

export function calculateChemistry(
  squad: Player[],
  startingLineup: number[],
): number {
  const starters = squad.filter(p => startingLineup.includes(p.id));
  if (starters.length === 0) return 0;

  let totalChem = 0;

  // Count nationalities and their frequency
  const nationCounts = new Map<string, number>();
  for (const p of starters) {
    nationCounts.set(p.nationality, (nationCounts.get(p.nationality) ?? 0) + 1);
  }

  // Each pair of same-nation players adds chemistry
  for (const [, count] of nationCounts) {
    if (count >= 2) {
      totalChem += (count - 1) * CHEMISTRY_NATION_BONUS;
    }
  }

  // Captain trait bonus
  const hasCaptain = starters.some(p => p.rpg?.traits.some(t => t.id === "captain"));
  if (hasCaptain) totalChem += 5;

  // Base chemistry from team cohesion (everyone gets some)
  totalChem += Math.round(starters.length * CHEMISTRY_LEAGUE_BONUS);

  return Math.min(totalChem, CHEMISTRY_PERFECT);
}

// ── Pack Opening Logic ────────────────────────

export function rollRarity(guaranteedMin: CardRarity): CardRarity {
  const rarityOrder: CardRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
  const minIndex = rarityOrder.indexOf(guaranteedMin);

  // Build weighted pool excluding below-guaranteed rarities
  const pool = rarityOrder.slice(minIndex);
  const weights = pool.map(r => RARITY_CONFIG[r].weight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }

  return guaranteedMin;
}

// Generate attributes based on rarity CA range
export function generateRPGAttributes(rarity: CardRarity): {
  attrs: PlayerAttributes;
  ca: number;
} {
  const config = RARITY_CONFIG[rarity];
  const targetCA = config.minCA + Math.round(Math.random() * (config.maxCA - config.minCA));

  // Distribute CA across attributes with some variance
  const keys: (keyof PlayerAttributes)[] = ["pace", "shooting", "passing", "dribbling", "defending", "physical", "goalkeeping"];
  const raw: Record<string, number> = {};
  let sum = 0;

  for (const k of keys) {
    const v = 20 + Math.round(Math.random() * 60);
    raw[k] = v;
    sum += v;
  }

  // Scale to match target CA
  const scale = targetCA / (sum / keys.length);
  const attrs: PlayerAttributes = {
    pace: Math.min(99, Math.max(1, Math.round(raw.pace * scale))),
    shooting: Math.min(99, Math.max(1, Math.round(raw.shooting * scale))),
    passing: Math.min(99, Math.max(1, Math.round(raw.passing * scale))),
    dribbling: Math.min(99, Math.max(1, Math.round(raw.dribbling * scale))),
    defending: Math.min(99, Math.max(1, Math.round(raw.defending * scale))),
    physical: Math.min(99, Math.max(1, Math.round(raw.physical * scale))),
    goalkeeping: Math.min(99, Math.max(1, Math.round(raw.goalkeeping * scale))),
  };

  return { attrs, ca: targetCA };
}
