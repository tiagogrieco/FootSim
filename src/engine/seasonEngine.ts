import type { Player, Club } from "../types/game";
import type { LeagueStanding } from "./leagueEngine";
import { calculatePrizeForPosition, calculateSponsorRevenue } from "./financeEngine";

export interface SeasonEndResult {
  finalPosition: number;
  prizeMoney: number;
  sponsorRevenue: number;
  totalBonus: number;
  isChampion: boolean;
  promoted: boolean;
  relegated: boolean;
  topScorer: string | null;
  seasonSummary: string;
  updatedClubs: Club[];
}

export function processSeasonEnd(
  standings: LeagueStanding[],
  playerClubId: number,
  playerClub: Club,
  allClubs: Club[],
  allSquads?: Map<number, Player[]>,
  season?: number,
): SeasonEndResult {
  // Separate standings by league
  const serieA = standings.filter(s => s.league === "Série A");
  const serieB = standings.filter(s => s.league === "Série B");

  // Determine promotions and relegations
  // Bottom 2 of Série A go to B
  const relegatedIds = serieA.slice(-2).map(s => s.clubId);
  // Top 2 of Série B go to A
  const promotedIds = serieB.slice(0, 2).map(s => s.clubId);

  const updatedClubs = allClubs.map(c => {
    let nextLeague = c.league;
    let promoted = false;
    let relegated = false;

    if (relegatedIds.includes(c.id)) {
      nextLeague = "Série B";
      relegated = true;
    }
    if (promotedIds.includes(c.id)) {
      nextLeague = "Série A";
      promoted = true;
    }

    const clubStanding = standings.find(s => s.clubId === c.id);
    const clubLeagueStandings = c.league === "Série A" ? serieA : serieB;
    const position = clubStanding ? clubLeagueStandings.indexOf(clubStanding) + 1 : clubLeagueStandings.length;
    const isChampion = position === 1;

    let history = c.history ? [...c.history] : [];
    if (season !== undefined && clubStanding) {
      history.push({
        season,
        league: c.league,
        position,
        points: clubStanding.points,
        won: clubStanding.won,
        drawn: clubStanding.drawn,
        lost: clubStanding.lost,
        goalsFor: clubStanding.goalsFor,
        goalsAgainst: clubStanding.goalsAgainst,
        isChampion,
        promoted,
        relegated,
      });
    }

    return { ...c, league: nextLeague, history };
  });

  const myLeague = playerClub.league;
  const myLeagueStandings = myLeague === "Série A" ? serieA : serieB;

  const myStanding = myLeagueStandings.find(s => s.clubId === playerClubId);
  const position = myStanding
    ? myLeagueStandings.indexOf(myStanding) + 1
    : myLeagueStandings.length;

  // Prize money scales down for Série B
  const prizeMultiplier = myLeague === "Série A" ? 1 : 0.4;
  const prizeMoney = Math.round(calculatePrizeForPosition(position) * prizeMultiplier);
  const sponsorRevenue = calculateSponsorRevenue(playerClub);
  const totalBonus = prizeMoney + sponsorRevenue;

  const isChampion = position === 1;
  const relegated = relegatedIds.includes(playerClubId);
  const promoted = promotedIds.includes(playerClubId);

  // Find top scorer from all squads
  let topScorer: string | null = null;
  if (allSquads) {
    let maxGoals = 0;
    for (const [, squad] of allSquads) {
      for (const p of squad) {
        const goals = p.seasonStats?.goals || 0;
        if (goals > maxGoals) {
          maxGoals = goals;
          topScorer = `${p.name} (${goals} gols)`;
        }
      }
    }
  }

  let seasonSummary = "";
  if (isChampion && myLeague === "Série A") {
    seasonSummary = `🏆 CAMPEÃO! ${playerClub.name} conquista o título da Série A!`;
  } else if (isChampion && myLeague === "Série B") {
    seasonSummary = `🏆 CAMPEÃO DA SÉRIE B! ${playerClub.name} sobe para a divisão de elite!`;
  } else if (promoted) {
    seasonSummary = `📈 PROMOVIDO! ${playerClub.name} garantiu o acesso para a Série A!`;
  } else if (relegated) {
    seasonSummary = `📉 REBAIXADO. Temporada difícil, ${playerClub.name} jogará a Série B no próximo ano.`;
  } else if (position <= 3) {
    seasonSummary = `🥇 Excelente temporada! ${playerClub.name} termina em ${position}º lugar na ${myLeague}.`;
  } else if (position <= 6) {
    seasonSummary = `✅ Boa temporada. ${playerClub.name} termina em ${position}º lugar na ${myLeague}.`;
  } else {
    seasonSummary = `📊 ${playerClub.name} termina a temporada em ${position}º lugar na ${myLeague}.`;
  }

  return {
    finalPosition: position,
    prizeMoney,
    sponsorRevenue,
    totalBonus,
    isChampion,
    promoted,
    relegated,
    topScorer,
    seasonSummary,
    updatedClubs,
  };
}

/**
 * Age all players by 1 year, apply decay for older players,
 * growth for younger, and update market values accordingly.
 */
export function ageAllPlayers(players: Player[]): Player[] {
  return players.map(p => {
    const newAge = p.age + 1;

    let caChange = 0;
    if (newAge <= 23) {
      // Young players grow
      const growthRoom = p.potentialAbility - p.currentAbility;
      caChange = Math.floor(Math.random() * Math.min(5, growthRoom));
    } else if (newAge >= 31) {
      // Older players decline
      const decayRate = newAge >= 35 ? 4 : newAge >= 33 ? 3 : 2;
      caChange = -Math.floor(Math.random() * decayRate + 1);
    }

    const newCA = Math.max(20, Math.min(99, p.currentAbility + caChange));

    // Market value adjusts with age and CA
    let valueMultiplier = 1;
    if (newAge <= 24) valueMultiplier = 1.15;
    else if (newAge >= 32) valueMultiplier = 0.7;
    else if (newAge >= 30) valueMultiplier = 0.85;

    const newValue = Math.round(p.marketValue * valueMultiplier * (newCA / p.currentAbility));

    // Wage stays the same (contract)
    return {
      ...p,
      age: newAge,
      currentAbility: newCA,
      marketValue: Math.max(50000, newValue),
      fitness: Math.min(100, p.fitness + Math.floor(Math.random() * 15 + 5)), // Off-season recovery
      morale: Math.min(100, p.morale + Math.floor(Math.random() * 10 + 5)), // Reset morale
    };
  });
}

/**
 * Remove players who are too old (>38) and replace with generated youth
 */
export function retirePlayers(players: Player[]): {
  remaining: Player[];
  retired: string[];
} {
  const retired: string[] = [];
  const remaining = players.filter(p => {
    if (p.age > 38) {
      retired.push(p.name);
      return false;
    }
    return true;
  });
  return { remaining, retired };
}

/**
 * Get total rounds in a season for N teams (round-robin home & away)
 */
export function getTotalRounds(teamCount: number): number {
  return (teamCount - 1) * 2;
}
