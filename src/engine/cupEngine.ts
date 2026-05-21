import type { Club } from "../types/game";
import type { Fixture } from "./leagueEngine";

export interface CupRound {
  round: number;
  name: string;
  fixtures: Fixture[];
}

export interface CupState {
  rounds: CupRound[];
  fixtures: Fixture[];
  currentCupRound: number;
  eliminated: number[];
  champion: number | null;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Oitavas de Final",
  2: "Quartas de Final",
  3: "Semifinal",
  4: "Final",
};

export function generateCup(clubs: Club[], _season: number, startDate: Date): CupState {
  let participants = [...clubs];
  while (participants.length < 16) {
    participants.push(...clubs.slice(0, 16 - participants.length));
  }
  participants = participants.slice(0, 16);

  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  const firstRoundFixtures: Fixture[] = [];
  const date = new Date(startDate);
  date.setMonth(3); // April
  date.setDate(1);

  for (let i = 0; i < shuffled.length; i += 2) {
    const home = shuffled[i];
    const away = shuffled[i + 1];
    firstRoundFixtures.push({
      id: 10000 + 100 + i,
      round: 1,
      date: date.toISOString().split("T")[0],
      homeClubId: home.id,
      awayClubId: away.id,
      played: false,
      isCup: true,
    });
  }

  const round: CupRound = {
    round: 1,
    name: ROUND_NAMES[1],
    fixtures: firstRoundFixtures,
  };

  return {
    rounds: [round],
    fixtures: firstRoundFixtures,
    currentCupRound: 1,
    eliminated: [],
    champion: null,
  };
}

export function advanceCupRound(
  state: CupState,
  playedFixtures: Fixture[],
  clubs: Club[],
): CupState {
  const currentRoundFixtures = playedFixtures.filter(
    f => f.isCup && f.round === state.currentCupRound && f.played
  );

  if (currentRoundFixtures.length === 0) return state;

  const winners: number[] = [];
  const newEliminated: number[] = [...state.eliminated];

  for (const f of currentRoundFixtures) {
    if (!f.result) continue;
    let winnerId: number;
    if (f.result.homeGoals > f.result.awayGoals) {
      winnerId = f.homeClubId;
      newEliminated.push(f.awayClubId);
    } else if (f.result.awayGoals > f.result.homeGoals) {
      winnerId = f.awayClubId;
      newEliminated.push(f.homeClubId);
    } else {
      // Penalties — GK CA bonus
      const homeGK = clubs.find(c => c.id === f.homeClubId);
      const awayGK = clubs.find(c => c.id === f.awayClubId);
      const homeBonus = (homeGK?.reputation || 5000) / 10000;
      const awayBonus = (awayGK?.reputation || 5000) / 10000;
      winnerId = Math.random() + homeBonus > Math.random() + awayBonus
        ? f.homeClubId : f.awayClubId;
      const loserId = winnerId === f.homeClubId ? f.awayClubId : f.homeClubId;
      newEliminated.push(loserId);
      // Mark penalty result on fixture
      f.result.penalties = { winner: winnerId };
    }
    winners.push(winnerId);
  }

  // Check if this was the final
  const nextRoundNum = state.currentCupRound + 1;
  if (winners.length === 1) {
    return {
      ...state,
      eliminated: newEliminated,
      champion: winners[0],
      currentCupRound: nextRoundNum,
      fixtures: playedFixtures,
    };
  }

  // Generate next round fixtures
  const nextDate = new Date(currentRoundFixtures[0]?.date || new Date().toISOString());
  nextDate.setDate(nextDate.getDate() + 14); // 2 weeks later
  const dateStr = nextDate.toISOString().split("T")[0];

  const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);
  const nextFixtures: Fixture[] = [];

  for (let i = 0; i < shuffledWinners.length; i += 2) {
    nextFixtures.push({
      id: 10000 + nextRoundNum * 100 + i,
      round: nextRoundNum,
      date: dateStr,
      homeClubId: shuffledWinners[i],
      awayClubId: shuffledWinners[i + 1],
      played: false,
      isCup: true,
    });
  }

  const nextRound: CupRound = {
    round: nextRoundNum,
    name: ROUND_NAMES[nextRoundNum] || `Fase ${nextRoundNum}`,
    fixtures: nextFixtures,
  };

  return {
    rounds: [...state.rounds, nextRound],
    fixtures: [...playedFixtures, ...nextFixtures],
    currentCupRound: nextRoundNum,
    eliminated: newEliminated,
    champion: null,
  };
}

export function getCupBracket(state: CupState, clubs: Club[]): CupBracketEntry[] {
  const entries: CupBracketEntry[] = [];
  for (const round of state.rounds) {
    for (const f of round.fixtures) {
      const home = clubs.find(c => c.id === f.homeClubId);
      const away = clubs.find(c => c.id === f.awayClubId);
      entries.push({
        round: round.round,
        roundName: round.name,
        homeClub: home?.shortName || "???",
        homeClubId: f.homeClubId,
        awayClub: away?.shortName || "???",
        awayClubId: f.awayClubId,
        played: f.played,
        homeGoals: f.result?.homeGoals,
        awayGoals: f.result?.awayGoals,
        penalties: f.result?.penalties,
        winnerId: f.result
          ? f.result.penalties?.winner
            ?? (f.result.homeGoals > f.result.awayGoals ? f.homeClubId : f.awayClubId)
          : undefined,
      });
    }
  }
  return entries;
}

export interface CupBracketEntry {
  round: number;
  roundName: string;
  homeClub: string;
  homeClubId: number;
  awayClub: string;
  awayClubId: number;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  penalties?: { winner: number };
  winnerId?: number;
}
