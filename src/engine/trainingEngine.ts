import type { Player, PlayerAttributes, PositionCategory } from "../types/game";
import { calculateCA } from "../types/game";
import type { StaffMember } from "../types/staff";
import { getGrowthBonus, getInjuryReduction, getHealingBonus } from "./staffEngine";

export interface TrainingFocus {
  type: "team" | "individual" | "positional";
  attribute?: keyof PlayerAttributes;
  program?: TrainingProgram;
  intensity?: TrainingIntensity;
}

export type TrainingProgram =
  | "attack"      // shooting + dribbling + pace
  | "defense"     // defending + physical + pace
  | "playmaking"  // passing + dribbling + physical
  | "goalkeeping" // goalkeeping + physical + defending
  | "fitness";    // physical + pace (all positions)

export type TrainingIntensity = "light" | "normal" | "intense";

export interface Injury {
  playerId: number;
  playerName: string;
  position: string;
  type: string;
  weeksRemaining: number;
  severity: "minor" | "moderate" | "severe";
}

export interface PlayerTrainingReport {
  playerId: number;
  playerName: string;
  position: string;
  age: number;
  changes: { attr: keyof PlayerAttributes; label: string; before: number; after: number; delta: number }[];
  caBefore: number;
  caAfter: number;
  fitnessBefore: number;
  fitnessAfter: number;
  injured?: boolean;
  injuryType?: string;
}

export interface TrainingReport {
  players: PlayerTrainingReport[];
  focusLabel: string;
  infrastructure: number;
  intensity: TrainingIntensity;
  topGrower: { name: string; caDelta: number } | null;
  avgGrowth: number;
  newInjuries: Injury[];
  month: number;
  season: number;
}

const ATTR_LABELS: Record<keyof PlayerAttributes, string> = {
  pace: "Velocidade",
  shooting: "Finalização",
  passing: "Passe",
  dribbling: "Drible",
  defending: "Defesa",
  physical: "Físico",
  goalkeeping: "Goleiro",
};

const PROGRAM_WEIGHTS: Record<TrainingProgram, Partial<Record<keyof PlayerAttributes, number>>> = {
  attack:      { shooting: 2.5, dribbling: 1.5, pace: 1.0 },
  defense:     { defending: 2.5, physical: 1.5, pace: 1.0 },
  playmaking:  { passing: 2.5, dribbling: 1.5, physical: 0.5 },
  goalkeeping: { goalkeeping: 3.0, physical: 1.0, defending: 0.5 },
  fitness:     { physical: 2.0, pace: 2.0 },
};

const POSITION_PROGRAM_AFFINITY: Record<PositionCategory, TrainingProgram[]> = {
  GK:  ["goalkeeping", "fitness"],
  DEF: ["defense", "fitness", "playmaking"],
  MID: ["playmaking", "attack", "defense"],
  FWD: ["attack", "fitness", "playmaking"],
};

const INTENSITY_CONFIG: Record<TrainingIntensity, {
  growthMult: number;
  fatigueMult: number;
  injuryBaseChance: number;
  fitnessRange: [number, number];
  label: string;
}> = {
  light:   { growthMult: 0.6,  fatigueMult: 0.5,  injuryBaseChance: 0.01, fitnessRange: [8, 16],   label: "Leve" },
  normal:  { growthMult: 1.0,  fatigueMult: 1.0,  injuryBaseChance: 0.04, fitnessRange: [3, 8],  label: "Normal" },
  intense: { growthMult: 1.5,  fatigueMult: 1.8,  injuryBaseChance: 0.10, fitnessRange: [-3, 4],  label: "Intenso" },
};

const INJURY_TYPES: { name: string; minWeeks: number; maxWeeks: number; severity: Injury["severity"] }[] = [
  { name: "Fadiga muscular", minWeeks: 1, maxWeeks: 2, severity: "minor" },
  { name: "Contusão leve", minWeeks: 1, maxWeeks: 2, severity: "minor" },
  { name: "Estiramento", minWeeks: 2, maxWeeks: 4, severity: "moderate" },
  { name: "Distensão muscular", minWeeks: 2, maxWeeks: 4, severity: "moderate" },
  { name: "Entorse no tornozelo", minWeeks: 3, maxWeeks: 5, severity: "moderate" },
  { name: "Lesão no joelho", minWeeks: 4, maxWeeks: 8, severity: "severe" },
  { name: "Ruptura muscular", minWeeks: 4, maxWeeks: 6, severity: "severe" },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getFocusLabel(focus: TrainingFocus): string {
  if (focus.type === "team") return "Treino Coletivo";
  if (focus.type === "individual" && focus.attribute) {
    return `Foco: ${ATTR_LABELS[focus.attribute]}`;
  }
  if (focus.type === "positional" && focus.program) {
    const labels: Record<TrainingProgram, string> = {
      attack: "Programa Ofensivo",
      defense: "Programa Defensivo",
      playmaking: "Programa Armador",
      goalkeeping: "Programa Goleiro",
      fitness: "Programa Físico",
    };
    return labels[focus.program];
  }
  return "Treino";
}

function rollInjury(player: Player, intensity: TrainingIntensity, reduction = 0): Injury | null {
  const config = INTENSITY_CONFIG[intensity];
  let chance = config.injuryBaseChance * (1 - reduction);

  // Low fitness increases injury risk significantly
  if (player.fitness < 50) chance *= 3.0;
  else if (player.fitness < 65) chance *= 2.0;
  else if (player.fitness < 80) chance *= 1.3;

  // Age increases risk
  if (player.age > 32) chance *= 1.8;
  else if (player.age > 29) chance *= 1.3;

  // Already injured players can't get injured again
  if (player.injuryDays && player.injuryDays > 0) return null;

  if (Math.random() < chance) {
    // Severity influenced by intensity
    let poolEnd = INJURY_TYPES.length;
    if (intensity === "light") poolEnd = 4; // only minor/moderate
    else if (intensity === "normal") poolEnd = 5;

    const injuryTemplate = INJURY_TYPES[rand(0, poolEnd - 1)];
    const weeks = rand(injuryTemplate.minWeeks, injuryTemplate.maxWeeks);

    return {
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      type: injuryTemplate.name,
      weeksRemaining: weeks,
      severity: injuryTemplate.severity,
    };
  }

  return null;
}

/**
 * Monthly player development with intensity & injury system
 */
export function developPlayers(
  players: Player[],
  infrastructure: number,
  trainingFocus: TrainingFocus,
  staff: StaffMember[] = [],
): { developed: Player[]; newInjuries: Injury[] } {
  const intensity: TrainingIntensity = trainingFocus.intensity || "normal";
  const intensityCfg = INTENSITY_CONFIG[intensity];
  const growthBonus = getGrowthBonus(staff);
  const injuryReduction = getInjuryReduction(staff);
  const healingBonus = getHealingBonus(staff);
  const newInjuries: Injury[] = [];

  const developed = players.map(player => {
    // Skip players on strike — they refuse to train
    if (player.strikeDays && player.strikeDays > 0) {
      return {
        ...player,
        fitness: clamp(player.fitness + rand(3, 8), 50, 95),
      };
    }

    // Skip injured players — they rest, don't train
    if (player.injuryDays && player.injuryDays > 0) {
      const healRate = Math.round(7 * (1 - healingBonus));
      const healed = Math.max(0, player.injuryDays - Math.max(3, healRate));
      return {
        ...player,
        injuryDays: healed || undefined,
        fitness: clamp(player.fitness + rand(3, 8), 50, 95), // recover fitness while resting
      };
    }

    // Roll for injury (with staff reduction)
    const injury = rollInjury(player, intensity, injuryReduction);
    if (injury) {
      newInjuries.push(injury);
      return {
        ...player,
        injuryDays: injury.weeksRemaining * 7,
        fitness: clamp(player.fitness - rand(10, 20), 30, 100),
      };
    }

    const gap = player.potentialAbility - player.currentAbility;
    const newAttrs = { ...player.attributes };

    // Age-based growth multiplier
    let ageMultiplier: number;
    if (player.age <= 21) ageMultiplier = 1.5;
    else if (player.age <= 24) ageMultiplier = 1.2;
    else if (player.age <= 29) ageMultiplier = 0.6;
    else if (player.age <= 32) ageMultiplier = -0.3;
    else ageMultiplier = -0.8;

    // Infrastructure bonus (0-100 → 0.5-1.5)
    const infraBonus = 0.5 + (infrastructure / 100);

    // Base growth points
    const baseGrowth = gap > 0
      ? Math.max(0, ageMultiplier * infraBonus * (1 + growthBonus) * (gap / 30))
      : ageMultiplier * 0.5 * (1 + growthBonus);

    const attrKeys = Object.keys(newAttrs) as (keyof PlayerAttributes)[];

    for (const key of attrKeys) {
      if (key === "goalkeeping" && player.positionCategory !== "GK") continue;

      let growth = baseGrowth * intensityCfg.growthMult;

      // Individual attribute focus
      if (trainingFocus.type === "individual" && trainingFocus.attribute === key) {
        growth += rand(1, 3) * intensityCfg.growthMult;
      }

      // Positional program boost
      if (trainingFocus.type === "positional" && trainingFocus.program) {
        const weights = PROGRAM_WEIGHTS[trainingFocus.program];
        const programBoost = weights[key] || 0;
        const affinityPrograms = POSITION_PROGRAM_AFFINITY[player.positionCategory];
        const affinityBonus = affinityPrograms.includes(trainingFocus.program) ? 0.5 : 0;
        growth += (programBoost + affinityBonus) * intensityCfg.growthMult;
      }

      // Team training gives smaller uniform boost
      if (trainingFocus.type === "team") {
        growth += Math.random() * 1.0;
      }

      // Add a small positive variance for young players, negative for older
      if (player.age <= 29) {
        growth += Math.random() * 1.0; 
        growth = Math.max(0, growth); // Prevent random drops for young players
      } else {
        // Older players lose attributes, specially physical ones
        if (key === "pace" || key === "physical") {
          growth -= Math.random() * 2.5;
        } else {
          growth -= Math.random() * 1.0;
        }
      }

      // Fitness affects training effectiveness
      if (player.fitness < 60) {
        growth *= 0.6;
      } else if (player.fitness < 80) {
        growth *= 0.85;
      }

      newAttrs[key] = clamp(Math.round(newAttrs[key] + growth), 1, 99);
    }

    // Fitness based on intensity
    const [fatMin, fatMax] = intensityCfg.fitnessRange;
    const fitnessDelta = rand(fatMin, fatMax);
    const newFitness = clamp(player.fitness + fitnessDelta, 40, 100);
    const newMorale = clamp(
      player.morale + rand(-3, 5) + (intensity === "light" ? 3 : intensity === "intense" ? -2 : 0),
      20, 100,
    );

    return {
      ...player,
      attributes: newAttrs,
      currentAbility: calculateCA(newAttrs, player.positionCategory),
      fitness: newFitness,
      morale: newMorale,
    };
  });

  return { developed, newInjuries };
}

/**
 * Generate a training report comparing before/after
 */
export function generateTrainingReport(
  before: Player[],
  after: Player[],
  focus: TrainingFocus,
  infrastructure: number,
  newInjuries: Injury[],
  month: number,
  season: number,
): TrainingReport {
  const intensity: TrainingIntensity = focus.intensity || "normal";
  const reports: PlayerTrainingReport[] = [];

  for (const afterPlayer of after) {
    const beforePlayer = before.find(p => p.id === afterPlayer.id);
    if (!beforePlayer) continue;

    const changes: PlayerTrainingReport["changes"] = [];
    const attrKeys = Object.keys(ATTR_LABELS) as (keyof PlayerAttributes)[];

    for (const key of attrKeys) {
      const bVal = beforePlayer.attributes[key];
      const aVal = afterPlayer.attributes[key];
      const delta = aVal - bVal;
      if (delta !== 0) {
        changes.push({
          attr: key,
          label: ATTR_LABELS[key],
          before: bVal,
          after: aVal,
          delta,
        });
      }
    }

    const injuryInfo = newInjuries.find(inj => inj.playerId === afterPlayer.id);

    if (changes.length > 0 || injuryInfo) {
      reports.push({
        playerId: afterPlayer.id,
        playerName: afterPlayer.name,
        position: afterPlayer.position,
        age: afterPlayer.age,
        changes,
        caBefore: beforePlayer.currentAbility,
        caAfter: afterPlayer.currentAbility,
        fitnessBefore: beforePlayer.fitness,
        fitnessAfter: afterPlayer.fitness,
        injured: !!injuryInfo,
        injuryType: injuryInfo?.type,
      });
    }
  }

  // Sort by CA improvement
  reports.sort((a, b) => (b.caAfter - b.caBefore) - (a.caAfter - a.caBefore));

  const topGrower = reports.length > 0 && reports[0].caAfter > reports[0].caBefore
    ? { name: reports[0].playerName, caDelta: reports[0].caAfter - reports[0].caBefore }
    : null;

  const totalDelta = reports.reduce((s, r) => s + (r.caAfter - r.caBefore), 0);
  const avgGrowth = reports.length > 0 ? totalDelta / reports.length : 0;

  return {
    players: reports,
    focusLabel: getFocusLabel(focus),
    infrastructure,
    intensity,
    topGrower,
    avgGrowth,
    newInjuries,
    month,
    season,
  };
}

export { ATTR_LABELS, PROGRAM_WEIGHTS, POSITION_PROGRAM_AFFINITY, INTENSITY_CONFIG };
