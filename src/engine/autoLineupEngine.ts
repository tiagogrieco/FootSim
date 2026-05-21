// Auto-Lineup — escalação automática delegada ao treinador.
// Quality do headCoach define o quão bem ele monta o time.

import type { Player, Position } from "../types/game";
import type { StaffMember } from "../types/staff";

export interface AutoLineupSlot {
  position: Position;
}

export interface AutoLineupResult {
  ids: number[];
  coachName: string | null;
  coachQuality: number;     // 0..100 (0 = sem treinador, faz você mesmo)
  qualityLabel: "ideal" | "boa" | "média" | "fraca" | "amador";
  warnings: string[];       // ex: "Esqueceu de tirar João, lesionado"
  effectiveAvgCA: number;   // CA média do XI escolhido
}

function categoryOf(pos: Position): "GK" | "DEF" | "MID" | "FWD" {
  if (pos === "GK") return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(pos)) return "DEF";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "MID";
  return "FWD";
}

function scoreFor(p: Player, slotPos: Position, quality: number): number {
  // Base attributes
  const ca = p.currentAbility ?? 50;
  const form = (p.form ?? 50);
  const fitness = (p.fitness ?? 100);
  const happiness = (p.happiness ?? 50);

  // Position fit
  let posBonus: number;
  if (p.position === slotPos) posBonus = 20;
  else if (p.positionCategory === categoryOf(slotPos)) posBonus = 5;
  else posBonus = -25;

  // Bad coaches ignore form/fitness — base their score mostly on raw CA
  const formWeight = quality >= 70 ? 0.30 : quality >= 50 ? 0.15 : 0.05;
  const fitnessWeight = quality >= 70 ? 0.10 : quality >= 50 ? 0.05 : 0.02;
  const happyWeight = quality >= 80 ? 0.05 : 0;

  // Fitness penalty stronger for good coaches
  const fitnessPenalty = fitness < 60 ? (quality >= 70 ? (60 - fitness) * 0.5 : 0) : 0;

  return ca + form * formWeight + fitness * fitnessWeight + happiness * happyWeight + posBonus - fitnessPenalty;
}

function rngTopK(rng: () => number, sorted: Player[], k: number): Player {
  const slice = sorted.slice(0, Math.min(k, sorted.length));
  // weight: rank 0 → weight (k), rank 1 → (k-1) ...
  const weights = slice.map((_, i) => slice.length - i);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < slice.length; i++) {
    r -= weights[i];
    if (r <= 0) return slice[i];
  }
  return slice[0];
}

function labelFromQuality(q: number): AutoLineupResult["qualityLabel"] {
  if (q >= 88) return "ideal";
  if (q >= 75) return "boa";
  if (q >= 60) return "média";
  if (q >= 40) return "fraca";
  return "amador";
}

export function autoBuildLineup(
  squad: Player[],
  slots: AutoLineupSlot[],
  headCoach: StaffMember | null,
  opts: { seed?: number } = {},
): AutoLineupResult {
  const quality = headCoach?.quality ?? 25; // sem treinador → muito ruim
  const coachName = headCoach?.name ?? null;
  const label = labelFromQuality(quality);

  // Deterministic RNG (mulberry32)
  let s = (opts.seed ?? Math.floor(Math.random() * 1e9)) | 0;
  const rng = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const eligible = squad.filter(p =>
    (!p.injuryDays || p.injuryDays <= 0) &&
    (!p.suspensionDays || p.suspensionDays <= 0)
  );

  // Bad coaches sometimes include risky players (low fitness or even injured)
  const pool = quality < 50
    ? squad.filter(p => !p.suspensionDays || p.suspensionDays <= 0)
    : eligible;

  const usedIds = new Set<number>();
  const ids: number[] = [];
  const warnings: string[] = [];
  let totalCA = 0;

  // K determines how "random" the pick is. High quality → K=1 (always best).
  let K: number;
  if (quality >= 88) K = 1;
  else if (quality >= 75) K = 2;
  else if (quality >= 60) K = 4;
  else if (quality >= 40) K = 6;
  else K = 9;

  for (const slot of slots) {
    const candidates = pool
      .filter(p => !usedIds.has(p.id))
      .map(p => ({ p, score: scoreFor(p, slot.position, quality) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.p);

    if (candidates.length === 0) {
      ids.push(0);
      continue;
    }

    const chosen = K === 1 ? candidates[0] : rngTopK(rng, candidates, K);
    usedIds.add(chosen.id);
    ids.push(chosen.id);
    totalCA += chosen.currentAbility ?? 0;

    // Warnings — surface mistakes
    if (chosen.position !== slot.position && chosen.positionCategory !== categoryOf(slot.position)) {
      warnings.push(`${chosen.name} fora de posição em ${slot.position}`);
    }
    if ((chosen.injuryDays ?? 0) > 0) {
      warnings.push(`${chosen.name} está lesionado e foi escalado mesmo assim`);
    }
    if ((chosen.fitness ?? 100) < 55 && quality < 70) {
      warnings.push(`${chosen.name} entra com fitness baixa (${chosen.fitness}%)`);
    }
    if (quality < 60) {
      const top = candidates[0];
      if (top.id !== chosen.id && (top.currentAbility - chosen.currentAbility) >= 8) {
        warnings.push(`Preferiu ${chosen.name} (${chosen.currentAbility}) a ${top.name} (${top.currentAbility})`);
      }
    }
  }

  return {
    ids,
    coachName,
    coachQuality: quality,
    qualityLabel: label,
    warnings: warnings.slice(0, 5),
    effectiveAvgCA: ids.length ? totalCA / ids.length : 0,
  };
}
