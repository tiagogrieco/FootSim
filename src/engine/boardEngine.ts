import type { Club } from "../types/game";
import type { MatchResult } from "./matchEngine";
import type { BoardObjective, BoardConfidence } from "../types/board";
import { findRivalry } from "../data/rivalries";

// ────────────────────────────────────────────────
//  Generate season objectives based on club reputation
// ────────────────────────────────────────────────
export function generateBoardObjectives(club: Club, season: number): BoardObjective[] {
  const rep = club.reputation ?? 5000;
  const goals: BoardObjective[] = [];
  const mk = (o: Omit<BoardObjective, "season" | "status" | "progress">): BoardObjective => ({
    ...o, season, status: "pending", progress: 0,
  });

  // League finish target — based on reputation
  if (rep >= 8500) {
    goals.push(mk({
      id: `${season}-top1`, type: "league_top", target: 1, priority: "primary",
      description: "Ser CAMPEÃO da liga", icon: "🏆",
      reward: 50_000_000, xpReward: 1500,
    }));
    goals.push(mk({
      id: `${season}-top4`, type: "league_top", target: 4, priority: "secondary",
      description: "Garantir o G4 (Libertadores)", icon: "🏅",
      reward: 12_000_000, xpReward: 300,
    }));
  } else if (rep >= 7000) {
    goals.push(mk({
      id: `${season}-top4`, type: "league_top", target: 4, priority: "primary",
      description: "Classificar para a Libertadores (Top 4)", icon: "🏅",
      reward: 15_000_000, xpReward: 400,
    }));
    goals.push(mk({
      id: `${season}-top6`, type: "league_top", target: 6, priority: "secondary",
      description: "Pelo menos uma vaga na Sul-Americana (Top 6)", icon: "🥉",
      reward: 5_000_000, xpReward: 150,
    }));
  } else if (rep >= 5500) {
    goals.push(mk({
      id: `${season}-top6`, type: "league_top", target: 6, priority: "primary",
      description: "Top 6 — vaga em competição internacional", icon: "🥉",
      reward: 8_000_000, xpReward: 250,
    }));
    goals.push(mk({
      id: `${season}-avoid`, type: "avoid_relegation", target: 12, priority: "secondary",
      description: "Ficar acima do 12º (longe do Z4)", icon: "🛡️",
      reward: 3_000_000, xpReward: 100,
    }));
  } else {
    goals.push(mk({
      id: `${season}-avoid`, type: "avoid_relegation", target: 16, priority: "primary",
      description: "Permanecer na 1ª divisão (acima do 16º)", icon: "🛡️",
      reward: 6_000_000, xpReward: 300,
    }));
    goals.push(mk({
      id: `${season}-top10`, type: "league_top", target: 10, priority: "secondary",
      description: "Terminar entre os 10 primeiros", icon: "🎯",
      reward: 4_000_000, xpReward: 150,
    }));
  }

  // Secondary: wins / goals / derby
  goals.push(mk({
    id: `${season}-wins`, type: "win_count", target: 15, priority: "stretch",
    description: "Vencer 15+ partidas na temporada", icon: "🥇",
    reward: 2_000_000, xpReward: 100,
  }));
  goals.push(mk({
    id: `${season}-goals`, type: "goals_scored", target: 50, priority: "stretch",
    description: "Marcar 50+ gols na temporada", icon: "⚽",
    reward: 2_000_000, xpReward: 100,
  }));

  // Derby objective — only if club has rivalries
  const hasRivalry = findRivalry(club.id, 0) !== undefined ||
    [1,2,3,4,5,6,7,8,9,10,11,12,17].some(id => findRivalry(club.id, id) !== undefined);
  if (hasRivalry) {
    goals.push(mk({
      id: `${season}-derby`, type: "win_classic", target: 1, priority: "primary",
      description: "Vencer pelo menos UM clássico", icon: "🔥",
      reward: 5_000_000, xpReward: 200,
    }));
  }

  return goals;
}

// ────────────────────────────────────────────────
//  Update objectives from a match
// ────────────────────────────────────────────────
export function updateObjectivesFromMatch(
  objectives: BoardObjective[],
  match: MatchResult,
  playerClubId: number,
): { objectives: BoardObjective[]; newlyAchieved: BoardObjective[] } {
  const isHome = match.homeClub.id === playerClubId;
  const my = isHome ? match.homeGoals : match.awayGoals;
  const op = isHome ? match.awayGoals : match.homeGoals;
  const won = my > op;
  const opponentId = isHome ? match.awayClub.id : match.homeClub.id;
  const isDerby = !!findRivalry(playerClubId, opponentId);

  const newlyAchieved: BoardObjective[] = [];
  const updated = objectives.map(o => {
    if (o.status !== "pending") return o;
    let p = o.progress;
    switch (o.type) {
      case "win_count": if (won) p++; break;
      case "goals_scored": p += my; break;
      case "win_classic": if (won && isDerby) p = Math.max(p, 1); break;
      default: break;
    }
    if (p >= o.target && o.type !== "league_top" && o.type !== "avoid_relegation") {
      const next = { ...o, progress: p, status: "achieved" as const };
      newlyAchieved.push(next);
      return next;
    }
    return { ...o, progress: p };
  });

  return { objectives: updated, newlyAchieved };
}

// ────────────────────────────────────────────────
//  Update league-based objectives from standings
// ────────────────────────────────────────────────
export function updateObjectivesFromStanding(
  objectives: BoardObjective[],
  position: number,
): BoardObjective[] {
  return objectives.map(o => {
    if (o.status !== "pending") return o;
    if (o.type === "league_top") {
      return { ...o, progress: position };
    }
    if (o.type === "avoid_relegation") {
      return { ...o, progress: position };
    }
    return o;
  });
}

// ────────────────────────────────────────────────
//  Confidence calculation
// ────────────────────────────────────────────────
export function clampConfidence(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function confidenceLabel(v: number): BoardConfidence["label"] {
  if (v >= 80) return "trust";
  if (v >= 55) return "neutral";
  if (v >= 35) return "concerned";
  if (v >= 15) return "critical";
  return "sacking";
}

export function adjustConfidence(
  current: BoardConfidence,
  delta: number,
  reason: string,
  date: string,
): BoardConfidence {
  const newVal = clampConfidence(current.value + delta);
  const trend: BoardConfidence["trend"] = delta > 0 ? "up" : delta < 0 ? "down" : "stable";
  return {
    value: newVal,
    label: confidenceLabel(newVal),
    trend,
    history: [...current.history.slice(-15), { date, delta, reason }],
  };
}

export function confidenceDeltaFromMatch(match: MatchResult, playerClubId: number): { delta: number; reason: string } {
  const isHome = match.homeClub.id === playerClubId;
  const my = isHome ? match.homeGoals : match.awayGoals;
  const op = isHome ? match.awayGoals : match.homeGoals;
  const diff = my - op;
  const opponentId = isHome ? match.awayClub.id : match.homeClub.id;
  const isDerby = !!findRivalry(playerClubId, opponentId);
  const oppName = isHome ? match.awayClub.shortName : match.homeClub.shortName;

  let delta: number;
  let reason: string;
  if (diff >= 4) { delta = isDerby ? 12 : 6; reason = `Goleada vs ${oppName}`; }
  else if (diff > 0) { delta = isDerby ? 7 : 3; reason = `Vitória vs ${oppName}`; }
  else if (diff === 0) { delta = isDerby ? -1 : 0; reason = `Empate vs ${oppName}`; }
  else if (diff >= -2) { delta = isDerby ? -7 : -3; reason = `Derrota vs ${oppName}`; }
  else { delta = isDerby ? -12 : -6; reason = `Vexame vs ${oppName}`; }
  return { delta, reason };
}
