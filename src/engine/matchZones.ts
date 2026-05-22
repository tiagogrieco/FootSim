import type { Player, Position, PreferredFoot, Personality } from "../types/game";

export type FieldZone = "DEF_LEFT" | "DEF_CENTER" | "DEF_RIGHT" | "MID_LEFT" | "MID_CENTER" | "MID_RIGHT" | "ATK_LEFT" | "ATK_CENTER" | "ATK_RIGHT";

export const POSITION_ZONE_WEIGHTS: Record<Position, Partial<Record<FieldZone, number>>> = {
  GK:  { DEF_CENTER: 1.0 },
  CB:  { DEF_CENTER: 0.7, DEF_LEFT: 0.15, DEF_RIGHT: 0.15 },
  LB:  { DEF_LEFT: 0.5, MID_LEFT: 0.35, ATK_LEFT: 0.15 },
  RB:  { DEF_RIGHT: 0.5, MID_RIGHT: 0.35, ATK_RIGHT: 0.15 },
  CDM: { MID_CENTER: 0.6, DEF_CENTER: 0.4 },
  CM:  { MID_CENTER: 0.7, ATK_CENTER: 0.15, DEF_CENTER: 0.15 },
  CAM: { ATK_CENTER: 0.5, MID_CENTER: 0.3, ATK_LEFT: 0.1, ATK_RIGHT: 0.1 },
  LM:  { MID_LEFT: 0.6, ATK_LEFT: 0.25, DEF_LEFT: 0.15 },
  RM:  { MID_RIGHT: 0.6, ATK_RIGHT: 0.25, DEF_RIGHT: 0.15 },
  LW:  { ATK_LEFT: 0.55, MID_LEFT: 0.25, ATK_CENTER: 0.2 },
  RW:  { ATK_RIGHT: 0.55, MID_RIGHT: 0.25, ATK_CENTER: 0.2 },
  ST:  { ATK_CENTER: 0.7, ATK_LEFT: 0.15, ATK_RIGHT: 0.15 },
  CF:  { ATK_CENTER: 0.5, MID_CENTER: 0.25, ATK_LEFT: 0.125, ATK_RIGHT: 0.125 },
};

const LEFT_ZONES: FieldZone[] = ["DEF_LEFT", "MID_LEFT", "ATK_LEFT"];
const RIGHT_ZONES: FieldZone[] = ["DEF_RIGHT", "MID_RIGHT", "ATK_RIGHT"];

function getFootFactor(foot: PreferredFoot, zone: FieldZone): number {
  if (foot === "both") return 1.0;
  if (foot === "left" && RIGHT_ZONES.includes(zone)) return 0.92;
  if (foot === "right" && LEFT_ZONES.includes(zone)) return 0.92;
  return 1.0;
}

function getPersonalityFactor(p: Personality, minute: number, scoreDiff: number): number {
  switch (p) {
    case "leader": return scoreDiff <= 0 && minute > 70 ? 1.08 : 1.03;
    case "determined": return scoreDiff < 0 ? 1.06 : 1.0;
    case "professional": return 1.02;
    case "lazy": return minute > 75 ? 0.92 : 0.97;
    case "temperamental": return scoreDiff < -1 ? 0.90 : (scoreDiff > 0 ? 1.05 : 1.0);
    default: return 1.0;
  }
}

export function calcEffectiveCA(
  player: Player, zone: FieldZone, minute: number, scoreDiff: number
): number {
  const base = player.currentAbility;
  const fitnessPenalty = player.fitness < 75 ? 0.85 : 1.0;
  const fitnessFactor = (0.7 + (player.fitness / 100) * 0.3) * fitnessPenalty;
  // Moral impact increased: low morale = big penalty
  const moraleFactor = player.morale < 30
    ? 0.55 + (player.morale / 100) * 0.35
    : 0.75 + (player.morale / 100) * 0.35;
  // Happiness affects consistency
  const happinessFactor = player.happiness < 30
    ? 0.7 + (player.happiness / 100) * 0.3
    : 0.85 + (player.happiness / 100) * 0.2;
  const formFactor = 0.85 + ((player.form ?? 50) / 100) * 0.3;
  const footFactor = getFootFactor(player.preferredFoot ?? "right", zone);
  const personalityFactor = getPersonalityFactor(player.personality ?? "professional", minute, scoreDiff);

  const raw = base * fitnessFactor * moraleFactor * happinessFactor * formFactor * footFactor * personalityFactor;
  const floor = base * 0.45;
  return Math.max(floor, Math.min(99, raw));
}

export interface ZoneStrengths {
  DEF_LEFT: number; DEF_CENTER: number; DEF_RIGHT: number;
  MID_LEFT: number; MID_CENTER: number; MID_RIGHT: number;
  ATK_LEFT: number; ATK_CENTER: number; ATK_RIGHT: number;
}

export function calcZoneStrengths(
  players: Player[], minute: number, scoreDiff: number
): ZoneStrengths {
  const z: ZoneStrengths = {
    DEF_LEFT: 0, DEF_CENTER: 0, DEF_RIGHT: 0,
    MID_LEFT: 0, MID_CENTER: 0, MID_RIGHT: 0,
    ATK_LEFT: 0, ATK_CENTER: 0, ATK_RIGHT: 0,
  };
  for (const p of players) {
    const weights = POSITION_ZONE_WEIGHTS[p.position];
    if (!weights) continue;
    for (const [zone, weight] of Object.entries(weights)) {
      const eca = calcEffectiveCA(p, zone as FieldZone, minute, scoreDiff);
      z[zone as FieldZone] += eca * (weight as number);
    }
  }
  return z;
}

export function calcPossession(atkZones: ZoneStrengths, defZones: ZoneStrengths): number {
  const atkMid = atkZones.MID_LEFT + atkZones.MID_CENTER + atkZones.MID_RIGHT;
  const defMid = defZones.MID_LEFT + defZones.MID_CENTER + defZones.MID_RIGHT;
  const total = atkMid + defMid;
  if (total === 0) return 0.5;
  return Math.max(0.25, Math.min(0.75, atkMid / total));
}

export interface Momentum {
  home: number;
  away: number;
  homeStreak: number;
  awayStreak: number;
}

export function createMomentum(): Momentum {
  return { home: 1.0, away: 1.0, homeStreak: 0, awayStreak: 0 };
}

export function updateMomentum(m: Momentum, event: "home_goal" | "away_goal" | "home_chance" | "away_chance"): void {
  switch (event) {
    case "home_goal":
      m.home = 1.06; m.homeStreak = 4;
      m.away = 1.03; m.awayStreak = 2; // reaction
      break;
    case "away_goal":
      m.away = 1.06; m.awayStreak = 4;
      m.home = 1.03; m.homeStreak = 2;
      break;
    case "home_chance":
      m.homeStreak = Math.max(0, m.homeStreak - 1);
      if (m.homeStreak === 0) m.home = Math.max(0.97, m.home - 0.01);
      break;
    case "away_chance":
      m.awayStreak = Math.max(0, m.awayStreak - 1);
      if (m.awayStreak === 0) m.away = Math.max(0.97, m.away - 0.01);
      break;
  }
}

export function tickMomentum(m: Momentum): void {
  if (m.homeStreak > 0) m.homeStreak--;
  else m.home = Math.max(1.0, m.home - 0.012);
  if (m.awayStreak > 0) m.awayStreak--;
  else m.away = Math.max(1.0, m.away - 0.012);
}

export type AIMentality = "defensive" | "balanced" | "attacking";

export function getAIMentality(
  baseMentality: AIMentality, scoreDiff: number, minute: number
): AIMentality {
  if (scoreDiff <= -2) return "attacking";
  if (scoreDiff >= 2) return "defensive";
  if (scoreDiff < 0 && minute >= 75) return "attacking";
  if (scoreDiff > 0 && minute >= 80) return "defensive";
  return baseMentality;
}

export function getMentalityModifier(mentality: AIMentality): { atk: number; def: number } {
  switch (mentality) {
    case "attacking": return { atk: 1.15, def: 0.88 };
    case "defensive": return { atk: 0.85, def: 1.15 };
    default: return { atk: 1.0, def: 1.0 };
  }
}

export function calcHomeAdvantage(infrastructure: number): number {
  const base = 2;
  const infraBonus = Math.floor((infrastructure ?? 50) / 50);
  return base + Math.min(2, infraBonus);
}

export function pickAttackZone(zones: ZoneStrengths): FieldZone {
  const options: { zone: FieldZone; w: number }[] = [
    { zone: "ATK_LEFT", w: zones.ATK_LEFT },
    { zone: "ATK_CENTER", w: zones.ATK_CENTER },
    { zone: "ATK_RIGHT", w: zones.ATK_RIGHT },
  ];
  const total = options.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.w;
    if (r <= 0) return o.zone;
  }
  return "ATK_CENTER";
}

export function attackProgression(
  atkZones: ZoneStrengths, defZones: ZoneStrengths, atkMod: number, defMod: number
): { success: boolean; zone: FieldZone } {
  const midAtk = (atkZones.MID_LEFT + atkZones.MID_CENTER + atkZones.MID_RIGHT) * atkMod;
  const midDef = (defZones.MID_LEFT + defZones.MID_CENTER + defZones.MID_RIGHT) * defMod;

  // Biased towards attack: 55% base + ratio modifier → typical team passes ~55-65%
  const midRatio = midAtk / (midAtk + midDef);
  const midChance = 0.28 + midRatio * 0.50; // range: 0.28 - 0.78
  if (Math.random() > midChance) return { success: false, zone: "MID_CENTER" };

  const targetZone = pickAttackZone(atkZones);
  const mirrorZone = mirrorDefenseZone(targetZone);
  const finalAtk = (atkZones[targetZone] || 1) * atkMod;
  const finalDef = (defZones[mirrorZone] || 1) * defMod;
  const finalRatio = finalAtk / (finalAtk + finalDef);
  const finalChance = 0.18 + finalRatio * 0.55; // range: 0.18 - 0.73

  if (Math.random() > finalChance) return { success: false, zone: targetZone };
  return { success: true, zone: targetZone };
}

function mirrorDefenseZone(atkZone: FieldZone): FieldZone {
  switch (atkZone) {
    case "ATK_LEFT": return "DEF_RIGHT";
    case "ATK_RIGHT": return "DEF_LEFT";
    default: return "DEF_CENTER";
  }
}

export function calculateTeamChemistry(players: Player[]): number {
  if (players.length === 0) return 50;
  
  // Base: average happiness of starting 11
  const avgHappiness = players.reduce((s, p) => s + (p.happiness ?? 50), 0) / players.length;
  
  // Modifiers
  let modifier = 0;
  
  // Leader bonus
  const hasLeader = players.some(p => p.personality === "leader");
  if (hasLeader) modifier += 10;
  
  // Temperamental penalty
  const hasTemperamental = players.some(p => p.personality === "temperamental");
  if (hasTemperamental) modifier -= 10;
  
  // Salary inequality penalty
  const wages = players.map(p => p.wage).sort((a, b) => b - a);
  const avgWage = wages.reduce((s, w) => s + w, 0) / wages.length;
  if (wages[0] > avgWage * 3 || wages[1] > avgWage * 3 || wages[2] > avgWage * 3) {
    modifier -= 15;
  }
  
  // Recent form streak (simplified: check last 3 matches via form as proxy)
  const avgForm = players.reduce((s, p) => s + (p.form ?? 50), 0) / players.length;
  if (avgForm >= 70) modifier += 5;
  else if (avgForm <= 30) modifier -= 5;
  
  return Math.max(0, Math.min(100, avgHappiness + modifier));
}
