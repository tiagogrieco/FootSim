import { useState, useCallback } from "react";
import type { Club } from "../types/game";
import type { MatchResult } from "../engine/matchEngine";
import type { LeagueStanding, Fixture } from "../engine/leagueEngine";
import { generateFixtures, createStandings } from "../engine/leagueEngine";
import type { CupState } from "../engine/cupEngine";
import { generateCup, advanceCupRound } from "../engine/cupEngine";
import type { SaveData } from "../engine/saveEngine";
import { simulateMatchDay } from "../engine/matchDayEngine";
import type { Player } from "../types/game";
import { processSeasonEnd, getTotalRounds, type SeasonEndResult } from "../engine/seasonEngine";

export function useMatchManager() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [cupFixtures, setCupFixtures] = useState<Fixture[]>([]);
  const [cupRound, setCupRound] = useState(1);
  const [cupState, setCupState] = useState<CupState>({
    rounds: [], fixtures: [], currentCupRound: 1, eliminated: [], champion: null,
  });
  const [lastMatchResult, setLastMatchResult] = useState<MatchResult | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>([]);
  const [seasonEndResult, setSeasonEndResult] = useState<SeasonEndResult | null>(null);

  const startNewGame = useCallback((freshClubs: Club[], season: number, currentDate: string) => {
    const allLeagues = Array.from(new Set(freshClubs.map(c => c.league)));
    const leagueStandings: LeagueStanding[] = [];
    const leagueFixtures: Fixture[] = [];

    for (const l of allLeagues) {
      const clubsInLeague = freshClubs.filter(c => c.league === l);
      leagueStandings.push(...createStandings(clubsInLeague));
      leagueFixtures.push(...generateFixtures(clubsInLeague));
    }

    setStandings(leagueStandings);
    setFixtures(leagueFixtures);

    const cupInitState = generateCup(freshClubs, season, new Date(currentDate));
    setCupState(cupInitState);
    setCupFixtures(cupInitState.fixtures);
    setCupRound(1);

    setCurrentRound(0);
    setLastMatchResult(null);
    setMatchHistory([]);
    setSeasonEndResult(null);

    return { standings: leagueStandings, fixtures: leagueFixtures, cupState: cupInitState };
  }, []);

  const simulatePlayerMatch = useCallback((
    currentDate: string,
    currentFixtures: Fixture[],
    currentStandings: LeagueStanding[],
    currentSquads: Map<number, Player[]>,
    allClubs: Club[],
    playerClubId: number
  ) => {
    const result = simulateMatchDay(currentDate, currentFixtures, currentStandings, allClubs, currentSquads, playerClubId);
    setFixtures(result.fixtures);
    setStandings(result.standings);
    setCurrentRound(result.maxPlayedRound);
    if (result.playerMatch) {
      setLastMatchResult(result.playerMatch);
      setMatchHistory(prev => [...prev, result.playerMatch!]);
    }
    return result;
  }, []);

  const advanceDay = useCallback((
    dateStr: string,
    currentFixtures: Fixture[],
    currentStandings: LeagueStanding[],
    currentSquads: Map<number, Player[]>,
    allClubs: Club[],
    playerClubId: number,
    currentCupFixtures: Fixture[]
  ) => {
    const dayFixtures = currentFixtures.filter(f => f.date === dateStr && !f.played);
    const cupDayFixtures = currentCupFixtures.filter(f => f.date === dateStr && !f.played);
    const playerHasMatch = dayFixtures.some(f =>
      f.homeClubId === playerClubId || f.awayClubId === playerClubId
    );
    const playerHasCupMatch = cupDayFixtures.some(f =>
      f.homeClubId === playerClubId || f.awayClubId === playerClubId
    );

    let localFixtures = [...currentFixtures];
    let localStandings = [...currentStandings];
    let localSquads = currentSquads;
    let lastMaxRound = currentRound;

    if (dayFixtures.length > 0) {
      const result = simulateMatchDay(dateStr, currentFixtures, currentStandings, allClubs, currentSquads, playerClubId);
      localFixtures = result.fixtures;
      localStandings = result.standings;
      localSquads = result.allSquads;
      lastMaxRound = result.maxPlayedRound;
    }

    return {
      fixtures: localFixtures,
      standings: localStandings,
      squads: localSquads,
      playerHasMatch,
      playerHasCupMatch,
      maxPlayedRound: lastMaxRound,
    };
  }, [currentRound]);

  const startNewSeason = useCallback((nextClubs: Club[]) => {
    const allLeagues = Array.from(new Set(nextClubs.map(c => c.league)));
    const leagueStandings: LeagueStanding[] = [];
    const leagueFixtures: Fixture[] = [];

    for (const l of allLeagues) {
      const clubsInLeague = nextClubs.filter(c => c.league === l);
      leagueStandings.push(...createStandings(clubsInLeague));
      leagueFixtures.push(...generateFixtures(clubsInLeague));
    }

    setStandings(leagueStandings);
    setFixtures(leagueFixtures);
    setCurrentRound(0);
    setLastMatchResult(null);
    setMatchHistory([]);
    setSeasonEndResult(null);
    setCupFixtures([]);
    setCupRound(1);
    setCupState({ rounds: [], fixtures: [], currentCupRound: 1, eliminated: [], champion: null });

    return { standings: leagueStandings, fixtures: leagueFixtures };
  }, []);

  const advanceCup = useCallback(() => {
    const newState = advanceCupRound(cupState, cupFixtures, []);
    setCupState(newState);
    setCupFixtures(newState.fixtures);
    setCupRound(newState.currentCupRound);
    return newState;
  }, [cupState, cupFixtures]);

  const checkSeasonEnd = useCallback((
    result: ReturnType<typeof simulateMatchDay>,
    currentClubs: Club[],
    playerClub: Club,
    currentSeason: number
  ) => {
    const clubsInLeague = currentClubs.filter(c => c.league === playerClub.league).length;
    const totalRounds = getTotalRounds(clubsInLeague);
    if (result.maxPlayedRound >= totalRounds) {
      const endResult = processSeasonEnd(
        result.standings, playerClub.id, playerClub, currentClubs, result.allSquads, currentSeason,
      );
      setSeasonEndResult(endResult);
      return endResult;
    }
    return null;
  }, []);

  const applyLoadedState = useCallback((data: SaveData) => {
    const loadedClubs = (data.allClubs || []).map(c => ({ ...c, youthAcademy: c.youthAcademy || [] }));
    const migratedStandings = (data.standings || []).map(s => {
      if (s.league) return s;
      const c = loadedClubs.find(club => club.id === s.clubId);
      return { ...s, league: c ? c.league : "Série A" };
    });
    const migratedFixtures = (data.fixtures || []).map(f => {
      if (f.league) return f;
      const c = loadedClubs.find(club => club.id === f.homeClubId);
      return { ...f, league: c ? c.league : "Série A" };
    });
    setStandings(migratedStandings);
    setFixtures(migratedFixtures);
    setCurrentRound(data.currentRound);
    setLastMatchResult(data.lastMatchResult);
    setMatchHistory(data.matchHistory);
    setCupFixtures(data.cupFixtures || []);
    setCupRound(data.cupRound || 1);
    setCupState(data.cupState || { rounds: [], fixtures: [], currentCupRound: 1, eliminated: [], champion: null });
    setSeasonEndResult(data.seasonEndResult || null);
  }, []);

  return {
    fixtures,
    setFixtures,
    standings,
    setStandings,
    currentRound,
    setCurrentRound,
    cupFixtures,
    setCupFixtures,
    cupRound,
    setCupRound,
    cupState,
    setCupState,
    lastMatchResult,
    setLastMatchResult,
    matchHistory,
    setMatchHistory,
    seasonEndResult,
    setSeasonEndResult,
    startNewGame,
    simulatePlayerMatch,
    advanceDay,
    startNewSeason,
    advanceCup,
    checkSeasonEnd,
    applyLoadedState,
  };
}
