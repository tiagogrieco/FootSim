import type { Player, PlayerSeasonStats, Club } from "../types/game";
import { createEmptyStats } from "../types/game";
import type { MatchResult } from "./matchEngine";
import { simulateMatch } from "./matchEngine";
import type { LeagueStanding, Fixture } from "./leagueEngine";
import { updateStandings, sortStandings } from "./leagueEngine";

export interface MatchDayResult {
  fixtures: Fixture[];
  standings: LeagueStanding[];
  allSquads: Map<number, Player[]>;
  playerMatch: MatchResult | null;
  maxPlayedRound: number;
  matchRevenue: number;
  isHome: boolean;
}

export function simulateMatchDay(
  targetDate: string,
  localFixtures: Fixture[],
  localStandings: LeagueStanding[],
  clubs: Club[],
  squads: Map<number, Player[]>,
  playerClubId: number,
): MatchDayResult {
  const dayFixtures = localFixtures.filter(f => f.date === targetDate && !f.played);
  let updatedStandings = [...localStandings];
  let playerMatch: MatchResult | null = null;
  const results: MatchResult[] = [];

  for (const fixture of dayFixtures) {
    const homeClub = clubs.find(c => c.id === fixture.homeClubId)!;
    const awayClub = clubs.find(c => c.id === fixture.awayClubId)!;
    const homePlayers = (squads.get(fixture.homeClubId) || []).filter(p =>
      (!p.injuryDays || p.injuryDays <= 0) && (!p.suspensionDays || p.suspensionDays <= 0) && (!p.strikeDays || p.strikeDays <= 0)
    );
    const awayPlayers = (squads.get(fixture.awayClubId) || []).filter(p =>
      (!p.injuryDays || p.injuryDays <= 0) && (!p.suspensionDays || p.suspensionDays <= 0) && (!p.strikeDays || p.strikeDays <= 0)
    );
    const result = simulateMatch(homeClub as Club, awayClub as Club, homePlayers, awayPlayers);
    results.push(result);
    updatedStandings = updateStandings(updatedStandings, result);
    if (homeClub.id === playerClubId || awayClub.id === playerClubId) {
      playerMatch = result;
    }
  }

  const updatedFixtures = localFixtures.map(f => {
    if (f.date === targetDate && !f.played) {
      const r = results.find(res => res.homeClub.id === f.homeClubId && res.awayClub.id === f.awayClubId);
      return { ...f, played: true, result: r ? { homeGoals: r.homeGoals, awayGoals: r.awayGoals } : undefined };
    }
    return f;
  });

  // Apply match stats (fatigue, injuries, suspensions, ratings, form)
  const newSquads = new Map<number, Player[]>(squads);
  for (const result of results) {
    for (const team of ["home", "away"] as const) {
      const clubId = team === "home" ? result.homeClub.id : result.awayClub.id;
      const squad = newSquads.get(clubId);
      if (!squad) continue;

      const teamGoals = team === "home" ? result.homeGoals : result.awayGoals;
      const opponentGoals = team === "home" ? result.awayGoals : result.homeGoals;
      const didWin = teamGoals > opponentGoals;
      const didDraw = teamGoals === opponentGoals;
      const goalEvents = result.events.filter(e => e.type === "goal" && e.team === team);
      const cardEvents = result.events.filter(e => (e.type === "yellow_card" || e.type === "red_card") && e.team === team);
      const injuryEvents = result.events.filter(e => e.type === "injury" && e.team === team);

      const originalSquad = squads.get(clubId) || [];
      const activeBeforeMatch = originalSquad.filter(pl => 
        (!pl.injuryDays || pl.injuryDays <= 0) && 
        (!pl.suspensionDays || pl.suspensionDays <= 0) &&
        (!pl.strikeDays || pl.strikeDays <= 0)
      );
      const startersBeforeMatch = activeBeforeMatch.slice(0, 11);

      // Team-wide morale shift based on result
      const teamMoraleShift = didWin ? 3 : didDraw ? 0 : -5;

      newSquads.set(clubId, squad.map(p => {
        let fitness = p.fitness;
        let injuryDays = p.injuryDays;
        let suspensionDays = p.suspensionDays;
        const impact = result.fitnessImpact.get(p.id);
        if (impact) fitness = Math.max(10, fitness - impact);
        const injEvt = injuryEvents.find(e => e.playerName === p.name);
        if (injEvt?.injuryDays) injuryDays = injEvt.injuryDays;
        const redEvt = cardEvents.find(e => e.type === "red_card" && e.playerName === p.name);
        if (redEvt?.suspensionDays) suspensionDays = redEvt.suspensionDays;

        const stats: PlayerSeasonStats = { ...(p.seasonStats || createEmptyStats()) };
        const teamGoals = team === "home" ? result.homeGoals : result.awayGoals;
        const didWin = teamGoals > opponentGoals;
        const didDraw = teamGoals === opponentGoals;
        let happiness = p.happiness ?? 50;

        const started = startersBeforeMatch.some(st => st.id === p.id);
        let promiseMatches = p.playtimePromiseMatches ?? 0;
        let promiseStarts = p.playtimePromiseStarts ?? 0;
        let strikeDaysVal = p.strikeDays ?? 0;
        let pMorale = p.morale ?? 50;

        if (clubId === playerClubId && promiseMatches > 0) {
          promiseMatches -= 1;
          if (started) {
            promiseStarts += 1;
          }
          if (promiseMatches === 0) {
            if (promiseStarts >= 1) {
              happiness = Math.min(100, happiness + 20);
              pMorale = Math.min(100, pMorale + 15);
            } else {
              happiness = 5;
              pMorale = 5;
              strikeDaysVal = 7;
            }
            promiseMatches = 0;
            promiseStarts = 0;
          }
        }

        if (!impact) {
          happiness = Math.max(10, happiness - 2); // benched = unhappy (-2)
          pMorale = Math.max(0, Math.min(100, pMorale + teamMoraleShift));
          return {
            ...p,
            seasonStats: stats,
            fitness,
            injuryDays,
            suspensionDays,
            form: p.form ?? 50,
            happiness,
            morale: pMorale,
            playtimePromiseMatches: promiseMatches > 0 ? promiseMatches : undefined,
            playtimePromiseStarts: promiseStarts > 0 ? promiseStarts : undefined,
            strikeDays: strikeDaysVal > 0 ? strikeDaysVal : undefined
          };
        }

        stats.appearances += 1;
        const pGoals = goalEvents.filter(e => e.playerName === p.name).length;
        stats.goals += pGoals;
        const pAssists = goalEvents.filter(e => e.assistName === p.name).length;
        stats.assists += pAssists;
        stats.yellowCards += cardEvents.filter(e => e.type === "yellow_card" && e.playerName === p.name).length;
        stats.redCards += cardEvents.filter(e => e.type === "red_card" && e.playerName === p.name).length;
        if (opponentGoals === 0 && (p.positionCategory === "GK" || p.positionCategory === "DEF")) stats.cleanSheets += 1;
        if (result.motm?.name === p.name && result.motm?.team === team) stats.motm += 1;

        const baseRating = 5.8 + (p.currentAbility / 100) * 2.2;
        let perfBonus = pGoals * 0.6 + pAssists * 0.35;

        if (p.positionCategory === "GK") {
          perfBonus += opponentGoals === 0 ? 1.2 : opponentGoals === 1 ? 0.3 : -(opponentGoals - 1) * 0.25;
          perfBonus += (p.attributes.goalkeeping / 100) * 0.6;
        } else if (p.positionCategory === "DEF") {
          perfBonus += opponentGoals === 0 ? 0.8 : opponentGoals >= 3 ? -0.4 : 0;
          perfBonus += (p.attributes.defending / 100) * 0.4 + (p.attributes.physical / 100) * 0.2;
        } else if (p.positionCategory === "MID") {
          perfBonus += pAssists * 0.15 + (p.attributes.passing / 100) * 0.4 + (p.attributes.dribbling / 100) * 0.15;
        } else {
          perfBonus += pGoals * 0.2 + (p.attributes.shooting / 100) * 0.3 + (p.attributes.pace / 100) * 0.15;
        }
        if (didWin) perfBonus += 0.3; else if (!didDraw) perfBonus -= 0.2;
        if (result.motm?.name === p.name && result.motm?.team === team) perfBonus += 0.5;

        const matchRating = Math.min(10, Math.max(4, baseRating + perfBonus + (Math.random() - 0.5) * 0.8));
        stats.totalRating += matchRating;
        stats.avgRating = Math.round((stats.totalRating / stats.appearances) * 10) / 10;
        const newForm = Math.round((p.form ?? 50) * 0.7 + Math.round((matchRating / 10) * 100) * 0.3);

        // Happiness: playing time + result + rating
        happiness = Math.min(100, happiness + 2 + (didWin ? 2 : didDraw ? 0 : -1) + (matchRating >= 7 ? 1 : 0));
        pMorale = Math.max(0, Math.min(100, pMorale + teamMoraleShift));
        return {
          ...p,
          seasonStats: stats,
          fitness,
          injuryDays,
          suspensionDays,
          form: Math.max(10, Math.min(95, newForm)),
          happiness,
          morale: pMorale,
          playtimePromiseMatches: promiseMatches > 0 ? promiseMatches : undefined,
          playtimePromiseStarts: promiseStarts > 0 ? promiseStarts : undefined,
          strikeDays: strikeDaysVal > 0 ? strikeDaysVal : undefined
        };
      }));
    }
  }

  const maxPlayedRound = Math.max(...updatedFixtures.filter(f => f.played).map(f => f.round), 0);
  const isHome = playerMatch ? playerMatch.homeClub.id === playerClubId : false;

  return {
    fixtures: updatedFixtures,
    standings: sortStandings(updatedStandings),
    allSquads: newSquads,
    playerMatch,
    maxPlayedRound,
    matchRevenue: 0, // calculated by caller with club context
    isHome,
  };
}
