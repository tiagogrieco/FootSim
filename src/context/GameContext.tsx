import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { Player, Club, PlayerSeasonStats, SeasonHistoryEntry } from "../types/game";
import { calculateCA, createEmptyStats } from "../types/game";
import type { MatchResult } from "../engine/matchEngine";
import { simulateMatch } from "../engine/matchEngine";
import { generateSquadForClub, generateYouthPlayers } from "../engine/playerGenerator";
import { generateFixtures, createStandings, updateStandings, sortStandings } from "../engine/leagueEngine";
import type { LeagueStanding, Fixture } from "../engine/leagueEngine";
import { developPlayers, generateTrainingReport, type TrainingFocus, type TrainingReport } from "../engine/trainingEngine";
import {
  generateTransferMarket,
  generateIncomingOffers,
  evaluateOffer,
  type TransferListing,
  type TransferOffer,
} from "../engine/transferEngine";
import {
  createSaveData,
  saveToSlot,
  autoSave,
  loadFromSlot,
  loadAutoSave,
  deleteSlot,
  listSaveSlots,
  hasAutoSave,
  type SaveData,
  type SaveSlotInfo,
} from "../engine/saveEngine";
import { calculateMatchDayRevenue, generateSponsor } from "../engine/financeEngine";
import {
  processSeasonEnd,
  ageAllPlayers,
  retirePlayers,
  getTotalRounds,
  type SeasonEndResult,
} from "../engine/seasonEngine";
import rawPlayers from "../data/players.json";
import clubsData from "../data/clubs.json";
import allSquadsData from "../data/all_squads.json";

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface GameContextType {
  // State
  playerClub: Club;
  playerSquad: Player[];
  allClubs: Club[];
  allSquads: Map<number, Player[]>;
  standings: LeagueStanding[];
  fixtures: Fixture[];
  currentRound: number;
  currentDate: string;
  season: number;
  lastMatchResult: MatchResult | null;
  matchHistory: MatchResult[];
  trainingFocus: TrainingFocus;
  transferMarket: TransferListing[];
  incomingOffers: TransferOffer[];
  budget: number;
  lastTrainingReport: TrainingReport | null;

  // Save/Load
  gameStarted: boolean;
  lastSaveTime: string | null;
  saveGame: (slot: number, name?: string) => boolean;
  loadGame: (slot: number) => boolean;
  loadAutosave: () => boolean;
  deleteSave: (slot: number) => void;
  getSaveSlots: () => (SaveSlotInfo | null)[];
  hasAutosave: () => boolean;

  // Actions
  startNewGame: () => void;
  advanceRound: () => void;
  setTrainingFocus: (focus: TrainingFocus) => void;
  advanceMonth: () => void;
  refreshTransferMarket: () => void;
  makeOffer: (listingIndex: number, offerAmount: number) => "accepted" | "rejected";
  respondToOffer: (offerId: number, accept: boolean) => void;

  // Season
  seasonEndResult: SeasonEndResult | null;
  startNewSeason: () => void;
  updateStartingLineup: (newLineupIds: number[]) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerClub, setPlayerClub] = useState<Club>(clubsData[0] as Club);
  const [playerSquad, setPlayerSquad] = useState<Player[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>(clubsData as Club[]);
  const [allSquads, setAllSquads] = useState<Map<number, Player[]>>(new Map());
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentDate, setCurrentDate] = useState("2026-03-01");
  const [season, setSeason] = useState(2026);
  const [lastMatchResult, setLastMatchResult] = useState<MatchResult | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>([]);
  const [trainingFocus, setTrainingFocusState] = useState<TrainingFocus>({ type: "team" });
  const [transferMarket, setTransferMarket] = useState<TransferListing[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<TransferOffer[]>([]);
  const [budget, setBudget] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [seasonEndResult, setSeasonEndResult] = useState<SeasonEndResult | null>(null);
  const [lastTrainingReport, setLastTrainingReport] = useState<TrainingReport | null>(null);

  // Auto-save counter
  const actionCountRef = useRef(0);

  const performAutoSave = useCallback(() => {
    if (!gameStarted || playerSquad.length === 0) return;

    const data = createSaveData("Autosave", {
      playerClub, playerSquad, allSquads, standings, fixtures,
      currentRound, currentDate, season, lastMatchResult,
      matchHistory, trainingFocus, transferMarket, incomingOffers, budget,
      allClubs,
    });
    autoSave(data);
    setLastSaveTime(new Date().toISOString());
  }, [
    gameStarted, playerClub, playerSquad, allSquads, standings, fixtures,
    currentRound, currentDate, season, lastMatchResult, matchHistory,
    trainingFocus, transferMarket, incomingOffers, budget, allClubs,
  ]);

  // Auto-save every 3 actions
  const triggerAutoSave = useCallback(() => {
    actionCountRef.current += 1;
    if (actionCountRef.current >= 3) {
      actionCountRef.current = 0;
      performAutoSave();
    }
  }, [performAutoSave]);

  const applyLoadedState = useCallback((data: SaveData) => {
    const loadedClubs = data.allClubs || (clubsData as Club[]);
    setAllClubs(loadedClubs);
    const club = loadedClubs.find(c => c.id === data.playerClubId) || loadedClubs[0];
    setPlayerClub(club as Club);
    // Migrate old saves: ensure all players have seasonStats
    const migratedSquad = (data.playerSquad || []).map(p => ({ ...p, seasonStats: p.seasonStats || createEmptyStats(), careerHistory: p.careerHistory || [] }));
    setPlayerSquad(migratedSquad);
    const migratedSquads = new Map((data.allSquadsEntries || []).map(([id, squad]) => [
      id,
      (squad || []).map(p => ({ ...p, seasonStats: p.seasonStats || createEmptyStats(), careerHistory: p.careerHistory || [] })),
    ] as [number, Player[]]));
    setAllSquads(migratedSquads);
    // Migrate old saves: add league to standings and fixtures if missing
    const migratedStandings = (data.standings || []).map(s => {
      if (s.league) return s;
      const c = loadedClubs.find(club => club.id === s.clubId);
      return { ...s, league: c ? c.league : "Série A" };
    });
    setStandings(migratedStandings);

    const migratedFixtures = (data.fixtures || []).map(f => {
      if (f.league) return f;
      const c = loadedClubs.find(club => club.id === f.homeClubId);
      return { ...f, league: c ? c.league : "Série A" };
    });
    setFixtures(migratedFixtures);
    setCurrentRound(data.currentRound);
    setCurrentDate(data.currentDate);
    setSeason(data.season);
    setLastMatchResult(data.lastMatchResult);
    setMatchHistory(data.matchHistory);
    setTrainingFocusState(data.trainingFocus);
    setTransferMarket(data.transferMarket);
    setIncomingOffers(data.incomingOffers);
    setBudget(data.budget);
    setGameStarted(true);
    setLastSaveTime(data.timestamp);
  }, []);

  // Save/Load actions
  const saveGame = useCallback((slot: number, name?: string): boolean => {
    const slotName = name || `Save ${slot}`;
    const data = createSaveData(slotName, {
      playerClub, playerSquad, allSquads, standings, fixtures,
      currentRound, currentDate, season, lastMatchResult,
      matchHistory, trainingFocus, transferMarket, incomingOffers, budget,
      allClubs,
    });
    const ok = saveToSlot(slot, data);
    if (ok) setLastSaveTime(new Date().toISOString());
    return ok;
  }, [
    playerClub, playerSquad, allSquads, standings, fixtures,
    currentRound, currentDate, season, lastMatchResult, matchHistory,
    trainingFocus, transferMarket, incomingOffers, budget, allClubs,
  ]);

  const loadGameFromSlot = useCallback((slot: number): boolean => {
    const data = loadFromSlot(slot);
    if (!data) return false;
    applyLoadedState(data);
    return true;
  }, [applyLoadedState]);

  const loadAutosaveAction = useCallback((): boolean => {
    const data = loadAutoSave();
    if (!data) return false;
    applyLoadedState(data);
    return true;
  }, [applyLoadedState]);

  const deleteSave = useCallback((slot: number) => {
    deleteSlot(slot);
  }, []);

  const getSaveSlots = useCallback((): (SaveSlotInfo | null)[] => {
    return listSaveSlots(allClubs as Club[]);
  }, [allClubs]);

  const hasAutosaveAction = useCallback((): boolean => {
    return hasAutoSave();
  }, []);

  const startNewGame = useCallback(() => {
    // Check for custom mod pack
    const modData = localStorage.getItem("footsim_custom_data");
    let initialClubs = clubsData as Club[];
    let initialPlayers = rawPlayers as Player[];

    if (modData) {
      try {
        const parsedMod = JSON.parse(modData);
        if (parsedMod.clubs && Array.isArray(parsedMod.clubs)) {
          initialClubs = parsedMod.clubs;
        }
        if (parsedMod.players && Array.isArray(parsedMod.players)) {
          initialPlayers = parsedMod.players;
        }
      } catch (e) {
        console.error("Failed to load mod data, falling back to default.", e);
      }
    }

    // Generate fresh clubs with sponsors
    const freshClubs = initialClubs.map(c => ({
      ...c,
      sponsor: generateSponsor(c as Club)
    }));
    setAllClubs(freshClubs);
    setPlayerClub(freshClubs[0]);

    const squad = initialPlayers.map(p => ({
      ...p,
      currentAbility: calculateCA(p.attributes, p.positionCategory),
      seasonStats: p.seasonStats || createEmptyStats(),
    }));
    setPlayerSquad(squad);

    const squads = new Map<number, Player[]>();
    squads.set(freshClubs[0].id, squad);

    // Use real squad data from SoccerWiki when available (only if no mod pack is active for that club)
    const realSquads = allSquadsData as Record<string, any[]>;
    for (let i = 1; i < freshClubs.length; i++) {
      const clubId = freshClubs[i].id;
      const realSquad = realSquads[String(clubId)];
      
      // If we are using a mod pack, we might not have realSquads data for custom clubs
      // so we always generate if missing. If modding, we still use realSquads if the IDs match, 
      // but ideally modders would also provide custom squad data. For simplicity, we just fallback to generator.
      if (realSquad && realSquad.length > 0 && !modData) {
        const aiSquad = realSquad.map(p => ({
          ...p,
          currentAbility: calculateCA(p.attributes, p.positionCategory),
          seasonStats: p.seasonStats || createEmptyStats(),
        })) as Player[];
        squads.set(clubId, aiSquad);
      } else {
        const aiSquad = generateSquadForClub(freshClubs[i]);
        squads.set(clubId, aiSquad);
      }
    }
    setAllSquads(squads);

    // Auto-populate startingLineup for all clubs based on highest CA
    for (const club of freshClubs) {
      const clubSquad = squads.get(club.id);
      if (clubSquad) {
        club.startingLineup = [...clubSquad]
          .sort((a, b) => b.currentAbility - a.currentAbility)
          .slice(0, 11)
          .map(p => p.id);
      }
    }
    setPlayerClub(freshClubs[0]); // Update playerClub since freshClubs[0] was mutated

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

    setCurrentRound(0);
    setCurrentDate("2026-03-01");
    setSeason(2026);
    setLastMatchResult(null);
    setMatchHistory([]);
    setBudget(freshClubs[0].budget);
    setGameStarted(true);

    // Generate initial transfer market
    const market = generateTransferMarket(freshClubs, squads, freshClubs[0].id);
    setTransferMarket(market);

    const offers = generateIncomingOffers(squad, freshClubs, freshClubs[0].id, squads);
    setIncomingOffers(offers);

    // Autosave right after new game
    actionCountRef.current = 0;
    setTimeout(() => {
      const data = createSaveData("Autosave", {
        playerClub: freshClubs[0], playerSquad: squad, allSquads: squads,
        standings: leagueStandings, fixtures: leagueFixtures,
        currentRound: 0, currentDate: "2026-03-01", season: 2026,
        lastMatchResult: null, matchHistory: [],
        trainingFocus: { type: "team" }, transferMarket: market,
        incomingOffers: offers, budget: freshClubs[0].budget,
        allClubs: freshClubs,
      });
      autoSave(data);
    }, 500);
  }, []);

  const advanceRound = useCallback(() => {
    const nextRound = currentRound + 1;
    const roundFixtures = fixtures.filter(f => f.round === nextRound && !f.played);

    if (roundFixtures.length === 0) return;

    let updatedStandings = [...standings];
    let playerMatch: MatchResult | null = null;
    const results: MatchResult[] = [];

    for (const fixture of roundFixtures) {
      const homeClub = allClubs.find(c => c.id === fixture.homeClubId)!;
      const awayClub = allClubs.find(c => c.id === fixture.awayClubId)!;
      const homePlayers = (allSquads.get(fixture.homeClubId) || []).filter(p => !p.injuryDays || p.injuryDays <= 0);
      const awayPlayers = (allSquads.get(fixture.awayClubId) || []).filter(p => !p.injuryDays || p.injuryDays <= 0);

      const result = simulateMatch(
        homeClub as Club,
        awayClub as Club,
        homePlayers,
        awayPlayers,
      );

      results.push(result);
      updatedStandings = updateStandings(updatedStandings, result);

      if (homeClub.id === playerClub.id || awayClub.id === playerClub.id) {
        playerMatch = result;
      }
    }

    const updatedFixtures = fixtures.map(f => {
      if (f.round === nextRound) {
        const result = results.find(
          r => r.homeClub.id === f.homeClubId && r.awayClub.id === f.awayClubId,
        );
        return {
          ...f,
          played: true,
          result: result ? { homeGoals: result.homeGoals, awayGoals: result.awayGoals } : undefined,
        };
      }
      return f;
    });

    setFixtures(updatedFixtures);
    setStandings(sortStandings(updatedStandings));
    setCurrentRound(nextRound);
    setLastMatchResult(playerMatch);
      if (playerMatch) {
        setMatchHistory(prev => [...prev, playerMatch!]);
      }

    // === Global Recovery & Injury Decay ===
    const newAllSquads = new Map<number, Player[]>();
    for (const [clubId, squad] of allSquads) {
      newAllSquads.set(clubId, squad.map(p => ({
        ...p,
        fitness: Math.min(100, p.fitness + rand(15, 25)),
        injuryDays: p.injuryDays ? Math.max(0, p.injuryDays - 7) : undefined,
      })));
    }

    // === Collect season stats for ALL clubs from ALL matches ===
    for (const result of results) {
      const homeId = result.homeClub.id;
      const awayId = result.awayClub.id;

      const updateSquadStats = (clubId: number, team: "home" | "away") => {
        const squad = newAllSquads.get(clubId);
        if (!squad) return;

        const opponentGoals = team === "home" ? result.awayGoals : result.homeGoals;
        const goalEvents = result.events.filter(e => e.type === "goal" && e.team === team);
        const cardEvents = result.events.filter(e => (e.type === "yellow_card" || e.type === "red_card") && e.team === team);
        const injuryEvents = result.events.filter(e => e.type === "injury" && e.team === team);

        const updatedSquad = squad.map(p => {
          let fitness = p.fitness;
          let injuryDays = p.injuryDays;

          // Apply match fatigue
          const impact = result.fitnessImpact.get(p.id);
          if (impact) {
            fitness = Math.max(10, fitness - impact);
          }

          // Apply match injuries
          const injuryEvent = injuryEvents.find(e => e.playerName === p.name);
          if (injuryEvent && injuryEvent.injuryDays) {
            injuryDays = injuryEvent.injuryDays;
          }

          const stats: PlayerSeasonStats = { ...(p.seasonStats || createEmptyStats()) };
          
          if (impact) {
            stats.appearances += 1;

            // Goals
            const playerGoals = goalEvents.filter(e => e.playerName === p.name).length;
            stats.goals += playerGoals;

            // Assists
            const playerAssists = goalEvents.filter(e => e.assistName === p.name).length;
            stats.assists += playerAssists;

            // Cards
            stats.yellowCards += cardEvents.filter(e => e.type === "yellow_card" && e.playerName === p.name).length;
            stats.redCards += cardEvents.filter(e => e.type === "red_card" && e.playerName === p.name).length;

            // Clean sheet for GK & DEF
            if (opponentGoals === 0 && (p.positionCategory === "GK" || p.positionCategory === "DEF")) {
              stats.cleanSheets += 1;
            }

            // MOTM
            if (result.motm && result.motm.name === p.name && result.motm.team === team) {
              stats.motm += 1;
            }

            // Rating (position-aware performance system)
            const baseRating = 5.8 + (p.currentAbility / 100) * 2.2;
            let perfBonus = 0;

            // Universal bonuses
            perfBonus += playerGoals * 0.6 + playerAssists * 0.35;

            // Position-specific modifiers
            const teamGoals = team === "home" ? result.homeGoals : result.awayGoals;
            const didWin = teamGoals > opponentGoals;
            const didDraw = teamGoals === opponentGoals;

            if (p.positionCategory === "GK") {
              if (opponentGoals === 0) perfBonus += 1.2;
              else if (opponentGoals === 1) perfBonus += 0.3;
              else perfBonus -= (opponentGoals - 1) * 0.25;
              perfBonus += (p.attributes.goalkeeping / 100) * 0.6;
            } else if (p.positionCategory === "DEF") {
              if (opponentGoals === 0) perfBonus += 0.8;
              else if (opponentGoals >= 3) perfBonus -= 0.4;
              perfBonus += (p.attributes.defending / 100) * 0.4;
              perfBonus += (p.attributes.physical / 100) * 0.2;
            } else if (p.positionCategory === "MID") {
              perfBonus += playerAssists * 0.15;
              perfBonus += (p.attributes.passing / 100) * 0.4;
              perfBonus += (p.attributes.dribbling / 100) * 0.15;
            } else {
              perfBonus += playerGoals * 0.2;
              perfBonus += (p.attributes.shooting / 100) * 0.3;
              perfBonus += (p.attributes.pace / 100) * 0.15;
            }

            // Win/loss modifier
            if (didWin) perfBonus += 0.3;
            else if (!didDraw) perfBonus -= 0.2;

            // MOTM bonus
            if (result.motm && result.motm.name === p.name && result.motm.team === team) {
              perfBonus += 0.5;
            }

            const randomFactor = (Math.random() - 0.5) * 0.8;
            const matchRating = Math.min(10, Math.max(4, baseRating + perfBonus + randomFactor));
            stats.totalRating += matchRating;
            stats.avgRating = Math.round((stats.totalRating / stats.appearances) * 10) / 10;
          }

          return { ...p, seasonStats: stats, fitness, injuryDays };
        });

        newAllSquads.set(clubId, updatedSquad);
      };

      updateSquadStats(homeId, "home");
      updateSquadStats(awayId, "away");
    }
    setAllSquads(newAllSquads);

    // Update player squad from the updated allSquads
    const updatedPlayerSquad = newAllSquads.get(playerClub.id);
    if (updatedPlayerSquad) {
      setPlayerSquad(updatedPlayerSquad);
    }

    const date = new Date(currentDate);
    date.setDate(date.getDate() + 7);
    setCurrentDate(date.toISOString().split("T")[0]);

    // Financial: deduct weekly wages + add match day revenue
    const weeklyWages = Math.round(playerSquad.reduce((s, p) => s + p.wage, 0) / 4);
    let financialDelta = -weeklyWages;

    // Match day revenue if we played at home
    if (playerMatch) {
      const isHome = playerMatch.homeClub.id === playerClub.id;
      const revenue = calculateMatchDayRevenue(playerClub, isHome);
      financialDelta += revenue;
    }

    setBudget(prev => prev + financialDelta);

    // Check if season is over
    const clubsInLeague = allClubs.filter(c => c.league === playerClub.league).length;
    const totalRounds = getTotalRounds(clubsInLeague);
    if (nextRound >= totalRounds) {
      const endResult = processSeasonEnd(
        sortStandings(updatedStandings),
        playerClub.id,
        playerClub,
        allClubs,
        newAllSquads,
        season,
      );
      setSeasonEndResult(endResult);
    }

    triggerAutoSave();
  }, [currentRound, fixtures, standings, allClubs, allSquads, playerClub, playerSquad, currentDate, triggerAutoSave]);

  const setTrainingFocus = useCallback((focus: TrainingFocus) => {
    setTrainingFocusState(focus);
  }, []);

  const startNewSeason = useCallback(() => {
    if (!seasonEndResult) return;

    // Award prize money and sponsor revenue
    setBudget(prev => prev + seasonEndResult.totalBonus);

    // Age all players across all squads + reset season stats
    const newAllSquads = new Map<number, Player[]>();
    for (const [clubId, squad] of allSquads) {
      const aged = ageAllPlayers(squad);
      const { remaining } = retirePlayers(aged);
      const clubInfo = allClubs.find(c => c.id === clubId);
      const clubName = clubInfo?.name || "Unknown";
      const clubShort = (clubInfo as Club)?.shortName || "???";
      
      let nextSquad = [...remaining];
      if (clubInfo) {
        // Calculate how many youth players to promote (1 to 3) based on infrastructure
        const youthCount = Math.max(1, Math.min(3, Math.floor((clubInfo.infrastructure || 50) / 30) + 1));
        const youthPlayers = generateYouthPlayers(clubInfo, youthCount);
        nextSquad = [...remaining, ...youthPlayers];
      }

      // Archive season stats into careerHistory, then reset
      const resetSquad = nextSquad.map(p => {
        const history: SeasonHistoryEntry[] = [...(p.careerHistory || [])];
        if (p.seasonStats && p.seasonStats.appearances > 0) {
          history.push({ season, clubName, clubShort, stats: { ...p.seasonStats } });
        }
        return { ...p, seasonStats: createEmptyStats(), careerHistory: history };
      });
      newAllSquads.set(clubId, resetSquad);

      if (clubId === playerClub.id) {
        setPlayerSquad(resetSquad);
      }
    }
    setAllSquads(newAllSquads);

    // New season
    const newSeason = season + 1;
    setSeason(newSeason);
    setCurrentRound(0);
    setCurrentDate(`${newSeason}-03-01`);
    setLastMatchResult(null);
    setMatchHistory([]);

    const nextClubs = seasonEndResult.updatedClubs;
    setAllClubs(nextClubs);

    const nextPlayerClub = nextClubs.find(c => c.id === playerClub.id) || playerClub;
    setPlayerClub(nextPlayerClub);

    // Reset standings and fixtures per league
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

    // Generate new transfer market
    const market = generateTransferMarket(nextClubs, newAllSquads, nextPlayerClub.id);
    setTransferMarket(market);
    setIncomingOffers([]);

    // Clear season end result
    setSeasonEndResult(null);

    triggerAutoSave();
  }, [seasonEndResult, allSquads, allClubs, playerClub, season, triggerAutoSave]);

  const advanceMonth = useCallback(() => {
    const newAllSquads = new Map<number, Player[]>();
    const beforePlayerSquad = allSquads.get(playerClub.id) || [];

    for (const [clubId, squad] of allSquads) {
      const club = allClubs.find(c => c.id === clubId);
      const infra = club?.infrastructure || 50;
      const focus = clubId === playerClub.id ? trainingFocus : { type: "team" as const };
      const developed = developPlayers(squad, infra, focus);
      newAllSquads.set(clubId, developed);

      if (clubId === playerClub.id) {
        setPlayerSquad(developed);

        // Generate training report for player's club
        const report = generateTrainingReport(
          beforePlayerSquad, developed, trainingFocus, playerClub.infrastructure
        );
        setLastTrainingReport(report);
      }
    }
    setAllSquads(newAllSquads);
    triggerAutoSave();
  }, [allSquads, allClubs, playerClub, trainingFocus, triggerAutoSave]);

  const refreshTransferMarket = useCallback(() => {
    const market = generateTransferMarket(allClubs as Club[], allSquads, playerClub.id);
    setTransferMarket(market);

    const offers = generateIncomingOffers(playerSquad, allClubs as Club[], playerClub.id, allSquads);
    setIncomingOffers(prev => [...prev.filter(o => o.status === "pending"), ...offers]);
  }, [allClubs, allSquads, playerClub, playerSquad]);

  const makeOffer = useCallback((listingIndex: number, offerAmount: number): "accepted" | "rejected" => {
    const listing = transferMarket[listingIndex];
    if (!listing) return "rejected";

    if (offerAmount > budget) return "rejected";

    const result = evaluateOffer(listing, offerAmount);

    if (result === "accepted") {
      const newPlayer = { ...listing.player, id: Date.now() };
      setPlayerSquad(prev => [...prev, newPlayer]);

      if (listing.sellerClubId !== null) {
        const sellerSquad = allSquads.get(listing.sellerClubId);
        if (sellerSquad) {
          const updated = sellerSquad.filter(p => p.id !== listing.player.id);
          const newSquads = new Map(allSquads);
          newSquads.set(listing.sellerClubId, updated);
          setAllSquads(newSquads);
        }
      }

      setBudget(prev => prev - offerAmount);
      setTransferMarket(prev => prev.filter((_, i) => i !== listingIndex));
      triggerAutoSave();
    }

    return result;
  }, [transferMarket, budget, allSquads, triggerAutoSave]);

  const respondToOffer = useCallback((offerId: number, accept: boolean) => {
    setIncomingOffers(prev =>
      prev.map(o => {
        if (o.id !== offerId) return o;
        if (!accept) return { ...o, status: "rejected" as const };

        setPlayerSquad(ps => ps.filter(p => p.id !== o.player.id));
        setBudget(b => b + o.offerAmount);

        return { ...o, status: "accepted" as const };
      }),
    );
    triggerAutoSave();
  }, [triggerAutoSave]);

  const updateStartingLineup = useCallback((newLineupIds: number[]) => {
    setPlayerClub(prev => ({
      ...prev,
      startingLineup: newLineupIds,
    }));
    setAllClubs(prev => prev.map(c => 
      c.id === playerClub.id ? { ...c, startingLineup: newLineupIds } : c
    ));
    triggerAutoSave();
  }, [playerClub.id, triggerAutoSave]);

  return (
    <GameContext.Provider value={{
      playerClub,
      playerSquad,
      allClubs,
      allSquads,
      standings,
      fixtures,
      currentRound,
      currentDate,
      season,
      lastMatchResult,
      matchHistory,
      trainingFocus,
      transferMarket,
      incomingOffers,
      budget,
      gameStarted,
      lastSaveTime,
      saveGame,
      loadGame: loadGameFromSlot,
      loadAutosave: loadAutosaveAction,
      deleteSave,
      getSaveSlots,
      hasAutosave: hasAutosaveAction,
      startNewGame,
      advanceRound,
      setTrainingFocus,
      advanceMonth,
      refreshTransferMarket,
      makeOffer,
      respondToOffer,
      updateStartingLineup,
      seasonEndResult,
      startNewSeason,
      lastTrainingReport,
    }}>
      {children}
    </GameContext.Provider>
  );
}
