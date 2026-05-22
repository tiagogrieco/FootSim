import type { MatchResult } from "./matchEngine";
import type { DailyChallenge, ChallengeType, NewsItem, ManagerProfile } from "../types/meta";
import { ACHIEVEMENTS, type AchievementDef } from "../data/achievements";

// ────────────────────────────────────────────────
//  XP / Level curve
// ────────────────────────────────────────────────
export function levelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}
export function xpForLevel(level: number): number {
  return Math.pow(Math.max(1, level) - 1, 2) * 100;
}
export function xpProgress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const lv = levelFromXP(xp);
  const base = xpForLevel(lv);
  const nextBase = xpForLevel(lv + 1);
  const cur = xp - base;
  const needed = nextBase - base;
  return { level: lv, current: cur, needed, percent: Math.min(100, (cur / needed) * 100) };
}

export const XP_REWARDS = {
  match_win: 50,
  match_draw: 15,
  match_loss: 5,
  motm: 20,
  clean_sheet: 15,
  goal_scored: 3,
  trophy: 500,
} as const;

// ────────────────────────────────────────────────
//  Daily challenges
// ────────────────────────────────────────────────
const CHALLENGE_POOL: Omit<DailyChallenge, "id" | "progress" | "done" | "claimed">[] = [
  { type: "win_match", description: "Vencer 1 partida", icon: "🏆", xpReward: 50, target: 1 },
  { type: "win_home", description: "Vencer em casa", icon: "🏠", xpReward: 40, target: 1 },
  { type: "win_away", description: "Vencer fora de casa", icon: "✈️", xpReward: 70, target: 1 },
  { type: "clean_sheet", description: "Manter uma partida sem sofrer gol", icon: "🛡️", xpReward: 60, target: 1 },
  { type: "score_2plus", description: "Marcar 2+ gols em uma partida", icon: "⚽", xpReward: 50, target: 1 },
  { type: "score_3plus", description: "Marcar 3+ gols em uma partida", icon: "💥", xpReward: 90, target: 1 },
  { type: "win_big", description: "Vencer por 3+ gols de diferença", icon: "🚜", xpReward: 80, target: 1 },
  { type: "motm", description: "Ter um jogador eleito Craque do Jogo", icon: "⭐", xpReward: 50, target: 1 },
  { type: "score_first", description: "Marcar antes dos 30'", icon: "⚡", xpReward: 35, target: 1 },
  { type: "comeback", description: "Virar uma partida estando perdendo", icon: "🔄", xpReward: 100, target: 1 },
];

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function rollDailyChallenges(dateKey: string): DailyChallenge[] {
  const seed = hashString(dateKey);
  const picked = new Set<ChallengeType>();
  const out: DailyChallenge[] = [];
  let cursor = seed;
  while (out.length < 3 && picked.size < CHALLENGE_POOL.length) {
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    const idx = cursor % CHALLENGE_POOL.length;
    const c = CHALLENGE_POOL[idx];
    if (picked.has(c.type)) continue;
    picked.add(c.type);
    out.push({
      ...c,
      id: `${dateKey}-${c.type}`,
      progress: 0,
      done: false,
      claimed: false,
    });
  }
  return out;
}

export function evaluateChallengesAfterMatch(
  challenges: DailyChallenge[],
  match: MatchResult,
  playerClubId: number,
): { challenges: DailyChallenge[]; newlyCompleted: DailyChallenge[] } {
  const isHome = match.homeClub.id === playerClubId;
  const mySide = isHome ? "home" : "away";
  const my = isHome ? match.homeGoals : match.awayGoals;
  const op = isHome ? match.awayGoals : match.homeGoals;
  const won = my > op;
  const firstGoal = [...match.events].sort((a, b) => a.minute - b.minute).find(e => e.type === "goal");
  const myFirstGoalEarly = firstGoal?.team === mySide && firstGoal.minute <= 30;

  // Comeback: was losing at any point but won at end
  let wasLosing = false;
  let runHome = 0, runAway = 0;
  for (const e of match.events) {
    if (e.type === "goal") {
      if (e.team === "home") runHome++;
      else if (e.team === "away") runAway++;
      const myRun = isHome ? runHome : runAway;
      const opRun = isHome ? runAway : runHome;
      if (opRun > myRun) wasLosing = true;
    }
  }
  const comeback = wasLosing && won;

  const newlyCompleted: DailyChallenge[] = [];
  const updated = challenges.map(c => {
    if (c.done) return c;
    let p = c.progress;
    switch (c.type) {
      case "win_match": if (won) p++; break;
      case "win_home": if (won && isHome) p++; break;
      case "win_away": if (won && !isHome) p++; break;
      case "clean_sheet": if (op === 0) p++; break;
      case "score_2plus": if (my >= 2) p++; break;
      case "score_3plus": if (my >= 3) p++; break;
      case "win_big": if (won && my - op >= 3) p++; break;
      case "motm": if (match.motm && match.motm.team === mySide) p++; break;
      case "score_first": if (myFirstGoalEarly) p++; break;
      case "comeback": if (comeback) p++; break;
    }
    const done = p >= c.target;
    const next = { ...c, progress: Math.min(p, c.target), done };
    if (done && !c.done) newlyCompleted.push(next);
    return next;
  });
  return { challenges: updated, newlyCompleted };
}

// ────────────────────────────────────────────────
//  Profile updates from a match
// ────────────────────────────────────────────────
export interface MatchDelta {
  profile: ManagerProfile;
  xpEarned: number;
  goalsScored: number;
  goalsConceded: number;
  hatTrick: boolean;
  win: boolean;
  cleanSheet: boolean;
}

export function applyMatchToProfile(
  profile: ManagerProfile,
  match: MatchResult,
  playerClubId: number,
): MatchDelta {
  const isHome = match.homeClub.id === playerClubId;
  const mySide = isHome ? "home" : "away";
  const my = isHome ? match.homeGoals : match.awayGoals;
  const op = isHome ? match.awayGoals : match.homeGoals;
  const won = my > op;
  const drew = my === op;
  const lost = my < op;
  const cleanSheet = op === 0;

  // hat-trick check
  const goalCount = new Map<string, number>();
  for (const e of match.events) {
    if (e.type === "goal" && e.team === mySide && e.playerName) {
      goalCount.set(e.playerName, (goalCount.get(e.playerName) ?? 0) + 1);
    }
  }
  const hatTrick = Array.from(goalCount.values()).some(n => n >= 3);

  let xp = 0;
  if (won) xp += XP_REWARDS.match_win;
  else if (drew) xp += XP_REWARDS.match_draw;
  else xp += XP_REWARDS.match_loss;
  if (cleanSheet) xp += XP_REWARDS.clean_sheet;
  if (match.motm && match.motm.team === mySide) xp += XP_REWARDS.motm;
  xp += my * XP_REWARDS.goal_scored;

  const newXP = profile.xp + xp;
  const newLevel = levelFromXP(newXP);

  const next: ManagerProfile = {
    ...profile,
    xp: newXP,
    level: newLevel,
    totalMatchesManaged: profile.totalMatchesManaged + 1,
    totalWins: profile.totalWins + (won ? 1 : 0),
    totalDraws: profile.totalDraws + (drew ? 1 : 0),
    totalLosses: profile.totalLosses + (lost ? 1 : 0),
    totalGoalsScored: profile.totalGoalsScored + my,
    totalGoalsConceded: profile.totalGoalsConceded + op,
    totalCleanSheets: profile.totalCleanSheets + (cleanSheet ? 1 : 0),
    cleanSheetStreak: cleanSheet ? profile.cleanSheetStreak + 1 : 0,
    winStreak: won ? profile.winStreak + 1 : 0,
    unbeatenRun: lost ? 0 : profile.unbeatenRun + 1,
    matchHatTricks: profile.matchHatTricks + (hatTrick ? 1 : 0),
    biggestWinMargin: won ? Math.max(profile.biggestWinMargin, my - op) : profile.biggestWinMargin,
    managerReputation: Math.max(0, Math.min(100, profile.managerReputation + (won ? 1 : lost ? -1 : 0))),
  };

  return { profile: next, xpEarned: xp, goalsScored: my, goalsConceded: op, hatTrick, win: won, cleanSheet };
}

export function evaluateNewAchievements(
  profile: ManagerProfile,
  unlocked: Set<string>,
): AchievementDef[] {
  const fresh: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    if (a.check(profile)) fresh.push(a);
  }
  return fresh;
}

// ────────────────────────────────────────────────
//  Newsfeed generation
// ────────────────────────────────────────────────
let newsCounter = 0;
function nid(prefix: string): string {
  newsCounter = (newsCounter + 1) % 100000;
  return `${prefix}-${Date.now()}-${newsCounter}`;
}

export function newsFromMatch(match: MatchResult, playerClubId: number, date: string): NewsItem[] {
  const isHome = match.homeClub.id === playerClubId;
  const me = isHome ? match.homeClub : match.awayClub;
  const opp = isHome ? match.awayClub : match.homeClub;
  const my = isHome ? match.homeGoals : match.awayGoals;
  const op = isHome ? match.awayGoals : match.homeGoals;
  const diff = my - op;
  const mySide = isHome ? "home" : "away";
  const out: NewsItem[] = [];

  if (diff >= 5) {
    out.push({
      id: nid("m"), date, read: false, tone: "big", icon: "🔥",
      headline: `GOLEADA HISTÓRICA! ${me.shortName} ${my}×${op} ${opp.shortName}`,
      body: `Atropelo total. Torcida em êxtase. Imprensa elogia o trabalho do treinador.`,
    });
  } else if (diff >= 3) {
    out.push({
      id: nid("m"), date, read: false, tone: "big", icon: "💥",
      headline: `Goleada: ${me.shortName} ${my}×${op} ${opp.shortName}`,
      body: `Show de bola. ${me.name} domina o ${opp.name} de ponta a ponta.`,
    });
  } else if (diff > 0) {
    out.push({
      id: nid("m"), date, read: false, tone: "good", icon: "🏆",
      headline: `${me.shortName} vence o ${opp.shortName} por ${my}×${op}`,
    });
  } else if (diff <= -4) {
    out.push({
      id: nid("m"), date, read: false, tone: "bad", icon: "💀",
      headline: `VEXAME! ${me.shortName} é humilhado pelo ${opp.shortName} (${my}×${op})`,
      body: `Torcida pede a cabeça do técnico. Diretoria reúne-se de urgência.`,
    });
  } else if (diff < 0) {
    out.push({
      id: nid("m"), date, read: false, tone: "bad", icon: "😞",
      headline: `Derrota: ${me.shortName} ${my}×${op} ${opp.shortName}`,
    });
  } else {
    out.push({
      id: nid("m"), date, read: false, tone: "neutral", icon: "🤝",
      headline: `Empate: ${me.shortName} ${my}×${op} ${opp.shortName}`,
    });
  }

  if (match.motm && match.motm.team === mySide && match.motm.rating >= 8.5) {
    out.push({
      id: nid("motm"), date, read: false, tone: "good", icon: "⭐",
      headline: `${match.motm.name} brilha — nota ${match.motm.rating.toFixed(1)}`,
      body: `Atuação de gala. Olheiros europeus já monitoram o jogador.`,
    });
  }

  // hat-trick callout
  const goalCount = new Map<string, number>();
  for (const e of match.events) {
    if (e.type === "goal" && e.team === mySide && e.playerName) {
      goalCount.set(e.playerName, (goalCount.get(e.playerName) ?? 0) + 1);
    }
  }
  for (const [name, n] of goalCount) {
    if (n >= 3) {
      out.push({
        id: nid("ht"), date, read: false, tone: "big", icon: "🎩",
        headline: `HAT-TRICK de ${name}!`,
        body: `${name} marca ${n} gols na partida e entra para a história do clube.`,
      });
    }
  }
  return out;
}

export function newsForLevelUp(level: number, date: string): NewsItem {
  return {
    id: nid("lvl"), date, read: false, tone: "good", icon: "🆙",
    headline: `Você subiu para o nível ${level}!`,
    body: `Sua experiência como treinador cresce. Diretoria nota seu progresso.`,
  };
}

export function newsForAchievement(name: string, icon: string, date: string): NewsItem {
  return {
    id: nid("ach"), date, read: false, tone: "good", icon,
    headline: `Conquista desbloqueada: ${name}`,
  };
}

export function adjustManagerReputation(
  profile: ManagerProfile,
  reason: "title" | "top4" | "relegation" | "sacking" | "promotion" | "custom",
  customDelta?: number
): ManagerProfile {
  const deltas: Record<string, number> = {
    title: 5,
    top4: 3,
    relegation: -2,
    sacking: -2,
    promotion: 4,
    custom: customDelta ?? 0,
  };
  const delta = deltas[reason] ?? 0;
  return {
    ...profile,
    managerReputation: Math.max(0, Math.min(100, profile.managerReputation + delta)),
  };
}
