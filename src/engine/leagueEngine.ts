import type { Club } from "../types/game";
import type { MatchResult } from "./matchEngine";

export interface LeagueStanding {
  clubId: number;
  clubName: string;
  clubShortName: string;
  league: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Fixture {
  id?: number;
  round: number;
  homeClubId: number;
  awayClubId: number;
  league?: string;
  played: boolean;
  result?: { homeGoals: number; awayGoals: number; penalties?: { winner: number } };
  date?: string;
  isCup?: boolean;
}

/**
 * Generate round-robin fixtures for a league.
 * Each team plays every other team twice (home and away).
 */
export function generateFixtures(clubs: Club[], seasonStartDate: string = "2026-03-01"): Fixture[] {
  const fixtures: Fixture[] = [];
  const n = clubs.length;
  const ids = clubs.map(c => c.id);
  const league = clubs.length > 0 ? clubs[0].league : "";

  // First half (each vs each, home)
  let round = 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      fixtures.push({
        round,
        homeClubId: ids[i],
        awayClubId: ids[j],
        league,
        played: false,
      });
      round++;
    }
  }

  // Second half (reverse home/away)
  const firstHalfLen = fixtures.length;
  for (let i = 0; i < firstHalfLen; i++) {
    fixtures.push({
      round: round + i,
      homeClubId: fixtures[i].awayClubId,
      awayClubId: fixtures[i].homeClubId,
      league,
      played: false,
    });
  }

  // Reorganize into proper rounds
  return assignRounds(fixtures, n, seasonStartDate);
}

function assignRounds(fixtures: Fixture[], teamCount: number, seasonStartDate: string): Fixture[] {
  const gamesPerRound = Math.floor(teamCount / 2);
  const totalRounds = (teamCount - 1) * 2;
  const sorted: Fixture[] = [];
  
  const baseDate = new Date(seasonStartDate);

  const unplayed = [...fixtures];
  for (let r = 1; r <= totalRounds; r++) {
    const usedTeams = new Set<number>();
    const roundGames: Fixture[] = [];

    const roundDate = new Date(baseDate);
    roundDate.setDate(roundDate.getDate() + (r - 1) * 7);
    const dateStr = roundDate.toISOString().split("T")[0];

    for (let i = unplayed.length - 1; i >= 0; i--) {
      const f = unplayed[i];
      if (!usedTeams.has(f.homeClubId) && !usedTeams.has(f.awayClubId)) {
        usedTeams.add(f.homeClubId);
        usedTeams.add(f.awayClubId);
        roundGames.push({ ...f, round: r, date: dateStr });
        unplayed.splice(i, 1);
        if (roundGames.length >= gamesPerRound) break;
      }
    }
    sorted.push(...roundGames);
  }

  // Add any remaining fixtures
  if (unplayed.length > 0) {
    const lastRound = sorted.length > 0 ? sorted[sorted.length - 1].round + 1 : 1;
    sorted.push(...unplayed.map((f, i) => {
      const rDate = new Date(baseDate);
      rDate.setDate(rDate.getDate() + ((lastRound + i) - 1) * 7);
      return { ...f, round: lastRound + i, date: rDate.toISOString().split("T")[0] };
    }));
  }

  return sorted;
}

export function createStandings(clubs: Club[]): LeagueStanding[] {
  return clubs.map(c => ({
    clubId: c.id,
    clubName: c.name,
    clubShortName: c.shortName,
    league: c.league,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));
}

export function updateStandings(
  standings: LeagueStanding[],
  result: MatchResult,
): LeagueStanding[] {
  return standings.map(s => {
    if (s.clubId === result.homeClub.id) {
      const won = result.homeGoals > result.awayGoals;
      const drawn = result.homeGoals === result.awayGoals;
      return {
        ...s,
        played: s.played + 1,
        won: s.won + (won ? 1 : 0),
        drawn: s.drawn + (drawn ? 1 : 0),
        lost: s.lost + (!won && !drawn ? 1 : 0),
        goalsFor: s.goalsFor + result.homeGoals,
        goalsAgainst: s.goalsAgainst + result.awayGoals,
        goalDifference: s.goalDifference + result.homeGoals - result.awayGoals,
        points: s.points + (won ? 3 : drawn ? 1 : 0),
      };
    }
    if (s.clubId === result.awayClub.id) {
      const won = result.awayGoals > result.homeGoals;
      const drawn = result.homeGoals === result.awayGoals;
      return {
        ...s,
        played: s.played + 1,
        won: s.won + (won ? 1 : 0),
        drawn: s.drawn + (drawn ? 1 : 0),
        lost: s.lost + (!won && !drawn ? 1 : 0),
        goalsFor: s.goalsFor + result.awayGoals,
        goalsAgainst: s.goalsAgainst + result.homeGoals,
        goalDifference: s.goalDifference + result.awayGoals - result.homeGoals,
        points: s.points + (won ? 3 : drawn ? 1 : 0),
      };
    }
    return s;
  });
}

export function sortStandings(standings: LeagueStanding[]): LeagueStanding[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}
