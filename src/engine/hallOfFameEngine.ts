import type { MatchResult } from "./matchEngine";
import type { Player, Club } from "../types/game";
import type {
  ClubHoF, ClubRecord, RecordType, Trophy, TrophyType, HoFState,
} from "../types/hallOfFame";
import { LEGEND_THRESHOLDS } from "../types/hallOfFame";

function emptyClubHoF(club: Club): ClubHoF {
  return {
    clubId: club.id,
    clubName: club.name,
    trophies: [],
    records: {},
    legends: {},
    totalMatches: 0,
    totalWins: 0,
  };
}

export function ensureClub(state: HoFState, club: Club): HoFState {
  if (state.byClub[club.id]) return state;
  return { ...state, byClub: { ...state.byClub, [club.id]: emptyClubHoF(club) } };
}

// ────────────────────────────────────────────────
// Records — try to beat existing
// ────────────────────────────────────────────────
function tryBeat(
  records: ClubHoF["records"],
  type: RecordType,
  candidate: ClubRecord,
): { records: ClubHoF["records"]; broken: boolean } {
  const cur = records[type];
  if (!cur || candidate.value > cur.value) {
    return { records: { ...records, [type]: candidate }, broken: true };
  }
  return { records, broken: false };
}

// Streak tracking (kept locally per club via state)
interface StreakState {
  unbeaten: number;
  wins: number;
  cleanSheets: number;
}
const streakKey = (clubId: number) => `__streak_${clubId}`;
function getStreaks(club: ClubHoF): StreakState {
  const s = (club as unknown as Record<string, unknown>)[streakKey(club.clubId)] as StreakState | undefined;
  return s ?? { unbeaten: 0, wins: 0, cleanSheets: 0 };
}
function setStreaks(club: ClubHoF, s: StreakState): ClubHoF {
  return { ...club, [streakKey(club.clubId)]: s } as ClubHoF;
}

export function recordMatch(
  state: HoFState,
  match: MatchResult,
  playerClubId: number,
  season: number,
): { state: HoFState; brokenRecords: ClubRecord[] } {
  if (!state.byClub[playerClubId]) return { state, brokenRecords: [] };

  const isHome = match.homeClub.id === playerClubId;
  const opp = isHome ? match.awayClub : match.homeClub;
  const my = isHome ? match.homeGoals : match.awayGoals;
  const op = isHome ? match.awayGoals : match.homeGoals;
  const mySide = isHome ? "home" : "away";
  const won = my > op;
  const lost = my < op;
  const margin = my - op;
  const date = new Date().toISOString().split("T")[0];

  let club = state.byClub[playerClubId];
  let records = club.records;
  const broken: ClubRecord[] = [];
  const streaks = getStreaks(club);

  // Biggest win (margin)
  if (won && margin >= 1) {
    const cand: ClubRecord = {
      type: "biggest_win", label: "Maior Goleada",
      value: margin, detail: `${margin > 0 ? "+" : ""}${margin} gols vs ${opp.shortName} (${my}×${op})`,
      season, date, icon: "💥",
    };
    const res = tryBeat(records, "biggest_win", cand);
    records = res.records;
    if (res.broken) broken.push(cand);
  }
  // Biggest loss (margin negativo, stored as positive magnitude)
  if (lost) {
    const cand: ClubRecord = {
      type: "biggest_loss", label: "Maior Derrota",
      value: -margin, detail: `${margin} gols vs ${opp.shortName} (${my}×${op})`,
      season, date, icon: "💀",
    };
    const res = tryBeat(records, "biggest_loss", cand);
    records = res.records;
    if (res.broken) broken.push(cand);
  }
  // Most goals in a match
  if (my > 0) {
    const cand: ClubRecord = {
      type: "most_goals_match", label: "Mais Gols em Uma Partida",
      value: my, detail: `${my} gols vs ${opp.shortName}`,
      season, date, icon: "⚽",
    };
    const res = tryBeat(records, "most_goals_match", cand);
    records = res.records;
    if (res.broken) broken.push(cand);
  }

  // Streaks
  const nextStreaks: StreakState = {
    unbeaten: lost ? 0 : streaks.unbeaten + 1,
    wins: won ? streaks.wins + 1 : 0,
    cleanSheets: op === 0 ? streaks.cleanSheets + 1 : 0,
  };

  if (nextStreaks.unbeaten >= 3) {
    const cand: ClubRecord = {
      type: "longest_unbeaten", label: "Maior Invencibilidade",
      value: nextStreaks.unbeaten, detail: `${nextStreaks.unbeaten} jogos sem perder`,
      season, date, icon: "🛡️",
    };
    const res = tryBeat(records, "longest_unbeaten", cand);
    records = res.records;
    if (res.broken) broken.push(cand);
  }
  if (nextStreaks.wins >= 3) {
    const cand: ClubRecord = {
      type: "longest_win_streak", label: "Maior Sequência de Vitórias",
      value: nextStreaks.wins, detail: `${nextStreaks.wins} vitórias seguidas`,
      season, date, icon: "🔥",
    };
    const res = tryBeat(records, "longest_win_streak", cand);
    records = res.records;
    if (res.broken) broken.push(cand);
  }

  // Update legend stats from match events
  const goalCount = new Map<string, number>();
  for (const e of match.events) {
    if (e.type === "goal" && e.team === mySide && e.playerName) {
      goalCount.set(e.playerName, (goalCount.get(e.playerName) ?? 0) + 1);
    }
  }

  club = { ...club, totalMatches: club.totalMatches + 1, totalWins: club.totalWins + (won ? 1 : 0), records };
  club = setStreaks(club, nextStreaks);

  return { state: { ...state, byClub: { ...state.byClub, [playerClubId]: club } }, brokenRecords: broken };
}

// ────────────────────────────────────────────────
// Update legends from full season squad stats
// ────────────────────────────────────────────────
export function syncLegendsFromSquad(
  state: HoFState,
  squad: Player[],
  clubId: number,
  season: number,
): HoFState {
  const club = state.byClub[clubId];
  if (!club) return state;

  const legends = { ...club.legends };
  for (const p of squad) {
    const stats = p.seasonStats;
    if (!stats || stats.appearances === 0) continue;

    const existing = legends[p.id];
    const career = p.careerHistory ?? [];
    // Sum apps/goals across history + current
    const totalApps = career.reduce((s, h) => s + (h.stats?.appearances ?? 0), 0) + (stats.appearances ?? 0);
    const totalGoals = career.reduce((s, h) => s + (h.stats?.goals ?? 0), 0) + (stats.goals ?? 0);
    const totalAssists = career.reduce((s, h) => s + (h.stats?.assists ?? 0), 0) + (stats.assists ?? 0);
    const totalMotm = career.reduce((s, h) => s + (h.stats?.motm ?? 0), 0) + (stats.motm ?? 0);
    const totalCS = career.reduce((s, h) => s + (h.stats?.cleanSheets ?? 0), 0) + (stats.cleanSheets ?? 0);

    const firstSeason = existing?.firstSeason ?? season;
    const isLegend =
      totalApps >= LEGEND_THRESHOLDS.apps ||
      totalGoals >= LEGEND_THRESHOLDS.goals ||
      totalMotm >= LEGEND_THRESHOLDS.motm;

    legends[p.id] = {
      playerId: p.id,
      name: p.name,
      apps: totalApps,
      goals: totalGoals,
      assists: totalAssists,
      motm: totalMotm,
      cleanSheets: totalCS,
      firstSeason,
      lastSeason: season,
      position: p.position,
      positionCategory: p.positionCategory,
      isLegend,
      legendaryFeats: existing?.legendaryFeats ?? [],
    };
  }

  return { ...state, byClub: { ...state.byClub, [clubId]: { ...club, legends } } };
}

// ────────────────────────────────────────────────
// Trophies
// ────────────────────────────────────────────────
export function awardTrophy(
  state: HoFState,
  clubId: number,
  trophyInfo: { name: string; competition: string; type: TrophyType; icon: string; rarity: Trophy["rarity"] },
  season: number,
): HoFState {
  const club = state.byClub[clubId];
  if (!club) return state;

  const trophy: Trophy = {
    id: `${clubId}-${season}-${trophyInfo.competition}-${Date.now()}`,
    name: trophyInfo.name,
    type: trophyInfo.type,
    competition: trophyInfo.competition,
    season,
    date: new Date().toISOString().split("T")[0],
    icon: trophyInfo.icon,
    rarity: trophyInfo.rarity,
  };
  const next = { ...club, trophies: [...club.trophies, trophy] };
  return { ...state, byClub: { ...state.byClub, [clubId]: next } };
}

// ────────────────────────────────────────────────
// Season-end record candidates (goals, etc)
// ────────────────────────────────────────────────
export function recordSeasonEnd(
  state: HoFState,
  clubId: number,
  squad: Player[],
  season: number,
): { state: HoFState; broken: ClubRecord[] } {
  const club = state.byClub[clubId];
  if (!club) return { state, broken: [] };

  let records = club.records;
  const broken: ClubRecord[] = [];
  const date = new Date().toISOString().split("T")[0];

  // Top scorer season
  const topScorer = [...squad].sort((a, b) => (b.seasonStats?.goals ?? 0) - (a.seasonStats?.goals ?? 0))[0];
  if (topScorer && (topScorer.seasonStats?.goals ?? 0) > 0) {
    const goals = topScorer.seasonStats!.goals;
    const cand: ClubRecord = {
      type: "most_goals_season", label: "Mais Gols numa Temporada",
      value: goals, detail: `${goals} gols por ${topScorer.name}`,
      holderName: topScorer.name, season, date, icon: "🎯",
    };
    const res = tryBeat(records, "most_goals_season", cand);
    records = res.records;
    if (res.broken) broken.push(cand);
  }

  // Top CS season (best GK/DEF)
  const topCS = [...squad].sort((a, b) => (b.seasonStats?.cleanSheets ?? 0) - (a.seasonStats?.cleanSheets ?? 0))[0];
  if (topCS && (topCS.seasonStats?.cleanSheets ?? 0) > 0) {
    const cs = topCS.seasonStats!.cleanSheets;
    const cand: ClubRecord = {
      type: "most_clean_sheets_season", label: "Mais Jogos Sem Sofrer (Temporada)",
      value: cs, detail: `${cs} clean sheets por ${topCS.name}`,
      holderName: topCS.name, season, date, icon: "🧤",
    };
    const res = tryBeat(records, "most_clean_sheets_season", cand);
    records = res.records;
    if (res.broken) broken.push(cand);
  }

  return {
    state: { ...state, byClub: { ...state.byClub, [clubId]: { ...club, records } } },
    broken,
  };
}
