import type { Player, PlayerAttributes, PositionCategory } from "../types/game";
import { calculateCA } from "../types/game";

export interface TrainingFocus {
  type: "team" | "individual" | "positional";
  attribute?: keyof PlayerAttributes;
  program?: TrainingProgram;
}

export type TrainingProgram =
  | "attack"      // shooting + dribbling + pace
  | "defense"     // defending + physical + pace
  | "playmaking"  // passing + dribbling + physical
  | "goalkeeping" // goalkeeping + physical + defending
  | "fitness";    // physical + pace (all positions)

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
}

export interface TrainingReport {
  players: PlayerTrainingReport[];
  focusLabel: string;
  infrastructure: number;
  topGrower: { name: string; caDelta: number } | null;
  avgGrowth: number;
}

// Attribute labels for reports
const ATTR_LABELS: Record<keyof PlayerAttributes, string> = {
  pace: "Velocidade",
  shooting: "Finalização",
  passing: "Passe",
  dribbling: "Drible",
  defending: "Defesa",
  physical: "Físico",
  goalkeeping: "Goleiro",
};

// Positional training programs boost specific attrs
const PROGRAM_WEIGHTS: Record<TrainingProgram, Partial<Record<keyof PlayerAttributes, number>>> = {
  attack:      { shooting: 2.5, dribbling: 1.5, pace: 1.0 },
  defense:     { defending: 2.5, physical: 1.5, pace: 1.0 },
  playmaking:  { passing: 2.5, dribbling: 1.5, physical: 0.5 },
  goalkeeping: { goalkeeping: 3.0, physical: 1.0, defending: 0.5 },
  fitness:     { physical: 2.0, pace: 2.0 },
};

// Which program benefits which position most
const POSITION_PROGRAM_AFFINITY: Record<PositionCategory, TrainingProgram[]> = {
  GK:  ["goalkeeping", "fitness"],
  DEF: ["defense", "fitness", "playmaking"],
  MID: ["playmaking", "attack", "defense"],
  FWD: ["attack", "fitness", "playmaking"],
};

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

/**
 * Monthly player development with full report
 */
export function developPlayers(
  players: Player[],
  infrastructure: number,
  trainingFocus: TrainingFocus,
): Player[] {
  return players.map(player => {
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
      ? Math.max(0, ageMultiplier * infraBonus * (gap / 30))
      : ageMultiplier * 0.5;

    const attrKeys = Object.keys(newAttrs) as (keyof PlayerAttributes)[];

    for (const key of attrKeys) {
      if (key === "goalkeeping" && player.positionCategory !== "GK") continue;

      let growth = baseGrowth + (Math.random() - 0.3) * 1.5;

      // Individual attribute focus
      if (trainingFocus.type === "individual" && trainingFocus.attribute === key) {
        growth += rand(1, 3);
      }

      // Positional program boost
      if (trainingFocus.type === "positional" && trainingFocus.program) {
        const weights = PROGRAM_WEIGHTS[trainingFocus.program];
        const programBoost = weights[key] || 0;

        // Extra bonus if program matches player's position
        const affinityPrograms = POSITION_PROGRAM_AFFINITY[player.positionCategory];
        const affinityBonus = affinityPrograms.includes(trainingFocus.program) ? 0.5 : 0;

        growth += programBoost + affinityBonus;
      }

      // Team training gives smaller uniform boost
      if (trainingFocus.type === "team") {
        growth += rand(0, 1);
      }

      // Older players lose physical attributes faster
      if (player.age > 30 && (key === "pace" || key === "physical")) {
        growth -= rand(0, 2);
      }

      // Fitness affects training effectiveness
      if (player.fitness < 60) {
        growth *= 0.6;
      } else if (player.fitness < 80) {
        growth *= 0.85;
      }

      newAttrs[key] = clamp(Math.round(newAttrs[key] + growth), 1, 99);
    }

    // Fitness recovery + training fatigue
    const fitnessDelta = trainingFocus.type === "positional"
      ? rand(-5, 3) // intensive programs tire players more
      : rand(-3, 5);
    const newFitness = clamp(player.fitness + fitnessDelta, 50, 100);
    const newMorale = clamp(player.morale + rand(-5, 5), 30, 100);

    return {
      ...player,
      attributes: newAttrs,
      currentAbility: calculateCA(newAttrs, player.positionCategory),
      fitness: newFitness,
      morale: newMorale,
    };
  });
}

/**
 * Generate a training report comparing before/after
 */
export function generateTrainingReport(
  before: Player[],
  after: Player[],
  focus: TrainingFocus,
  infrastructure: number,
): TrainingReport {
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

    if (changes.length > 0) {
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
    topGrower,
    avgGrowth,
  };
}

export { ATTR_LABELS, PROGRAM_WEIGHTS, POSITION_PROGRAM_AFFINITY };
