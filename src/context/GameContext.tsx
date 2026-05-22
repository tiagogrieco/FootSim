/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Player, Club, PlayerAttributes, InboxMessage, Sponsor, GameEvent, BoardObjective } from "../types/game";
import { calculateCA, createEmptyStats } from "../types/game";
import type { MatchResult } from "../engine/matchEngine";
import type { StaffMember } from "../types/staff";
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
import { generateYouthPlayers } from "../engine/playerGenerator";
import { generateSponsor } from "../engine/financeEngine";
import { simulateMatchDay } from "../engine/matchDayEngine";
// getTotalRounds moved to useMatchManager
import { addXP } from "../engine/rpgEngine";
import { useBoard } from "./BoardContext";
import { useToast } from "../hooks/useToast";
import clubsData from "../data/clubs.json";

import { useSquadManager } from "../hooks/useSquadManager";
import { useMatchManager } from "../hooks/useMatchManager";
import { useTransferManager } from "../hooks/useTransferManager";
import { useInboxManager } from "../hooks/useInboxManager";
import { useFinanceManager } from "../hooks/useFinanceManager";
import { useSeasonManager } from "../hooks/useSeasonManager";

import { generateBoardReviewEmail, generatePlayerDramaEmail, generateLocalPlayerDramaEmail, generateScoutReport } from "../engine/geminiEngine";

interface GameNotification {
  type: "match" | "offer" | "season_end" | "none" | "event";
  message: string;
  date: string;
}

interface GameContextType {
  // State
  playerClub: Club;
  playerSquad: Player[];
  allClubs: Club[];
  allSquads: Map<number, Player[]>;
  standings: import("../engine/leagueEngine").LeagueStanding[];
  fixtures: import("../engine/leagueEngine").Fixture[];
  currentRound: number;
  currentDate: string;
  season: number;
  lastMatchResult: MatchResult | null;
  matchHistory: MatchResult[];
  trainingFocus: import("../engine/trainingEngine").TrainingFocus;
  transferMarket: import("../engine/transferEngine").TransferListing[];
  incomingOffers: import("../engine/transferEngine").TransferOffer[];
  budget: number;
  lastTrainingReport: import("../engine/trainingEngine").TrainingReport | null;
  trainingHistory: import("../engine/trainingEngine").TrainingReport[];
  injuries: import("../engine/trainingEngine").Injury[];
  financialLedger: import("../engine/financeEngine").FinancialRecord[];
  upgradeInfrastructure: () => boolean;
  lastNotification: GameNotification;
  clearNotification: () => void;
  debt: number;
  setDebt: (debt: number) => void;
  payOffDebt: (amount: number) => void;

  // Staff
  staff: StaffMember[];
  staffPool: StaffMember[];
  hireStaff: (id: number) => void;
  fireStaff: (id: number) => void;

  // Sponsor Actions
  sponsorOffers: Sponsor[];
  searchSponsors: () => void;
  acceptSponsor: (sponsor: Sponsor) => void;

  // Save/Load
  gameStarted: boolean;
  lastSaveTime: string | null;
  saveGame: (slot: number, name?: string) => Promise<boolean>;
  loadGame: (slot: number) => Promise<boolean>;
  loadAutosave: () => Promise<boolean>;
  deleteSave: (slot: number) => Promise<void>;
  getSaveSlots: () => Promise<(SaveSlotInfo | null)[]>;
  hasAutosave: () => Promise<boolean>;

  // Actions
  startNewGame: (
    selectedClubId?: number,
    customClubConfig?: {
      name: string;
      shortName: string;
      colors: { primary: string; secondary: string };
    },
    roadToGlory?: boolean,
    difficulty?: "easy" | "medium" | "hard"
  ) => void;
  advanceDay: () => void;
  simulatePlayerMatch: () => void;
  setTrainingFocus: (focus: import("../engine/trainingEngine").TrainingFocus) => void;
  advanceMonth: () => void;
  refreshTransferMarket: () => void;
  makeOffer: (listingIndex: number, offerAmount: number) => "accepted" | "rejected" | "counter";
  respondToOffer: (offerId: number, accept: boolean) => void;
  listedForSale: number[];
  listForSale: (playerId: number) => void;
  unlistForSale: (playerId: number) => void;

  // Season
  seasonEndResult: import("../engine/seasonEngine").SeasonEndResult | null;
  startNewSeason: () => void;
  updateStartingLineup: (newLineupIds: number[]) => void;
  updateTactics: (formation: string, mentality: "defensive" | "balanced" | "attacking") => void;

  // Cup
  cupState: import("../engine/cupEngine").CupState;
  cupFixtures: import("../engine/leagueEngine").Fixture[];
  cupRound: number;
  advanceCupAfterMatch: () => void;

  // Transfer Window
  isTransferWindowOpen: boolean;

  // Direct Transfer
  makeTransferOffer: (player: Player, fromClubId: number, amount: number) => void;

  // Pack rewards
  addPackPlayers: (players: Player[], cost?: number) => void;

  // Events & Youth Academy (New features)
  pendingEvent: GameEvent | null;
  chooseEventOption: (optionIndex: number) => void;
  promoteYouthPlayer: (playerId: number) => void;
  changeYouthFocus: (playerId: number, focus: string) => void;

  // Inbox & AI Objectives
  inbox: InboxMessage[];
  activeBoardObjective: BoardObjective | null;
  addInboxMessage: (sender: string, subject: string, body: string, type: InboxMessage["type"], options?: InboxMessage["actionOptions"]) => void;
  markMessageRead: (messageId: string) => void;
  replyToMessage: (messageId: string, optionId: string) => void;
  generatePlayerScoutReport: (playerId: number) => Promise<string | null>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { confidence, adjustBoardConfidence } = useBoard();
  const { push: pushToast } = useToast();
  const [playerClub, setPlayerClub] = useState<Club>(clubsData[0] as Club);
  const [allClubs, setAllClubs] = useState<Club[]>(clubsData as Club[]);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [sponsorOffers, setSponsorOffers] = useState<Sponsor[]>([]);
  const [forceSaveFlag, setForceSaveFlag] = useState(0);

  const squadManager = useSquadManager();
  const matchManager = useMatchManager();
  const transferManager = useTransferManager();
  const inboxManager = useInboxManager();
  const financeManager = useFinanceManager();
  const seasonManager = useSeasonManager(adjustBoardConfidence);

  // Transfer window: open during rounds 0-5 and 17-22
  const isTransferWindowOpen = matchManager.currentRound <= 5 || (matchManager.currentRound >= 17 && matchManager.currentRound <= 22);

  // Auto-save counter
  const actionCountRef = useRef(0);

  const performAutoSave = useCallback(() => {
    if (!gameStarted || squadManager.playerSquad.length === 0) return;

    const data = createSaveData("Autosave", {
      playerClub,
      playerSquad: squadManager.playerSquad,
      allSquads: squadManager.allSquads,
      standings: matchManager.standings,
      fixtures: matchManager.fixtures,
      currentRound: matchManager.currentRound,
      currentDate: seasonManager.currentDate,
      season: seasonManager.season,
      lastMatchResult: matchManager.lastMatchResult,
      matchHistory: matchManager.matchHistory,
      trainingFocus: squadManager.trainingFocus,
      transferMarket: transferManager.transferMarket,
      incomingOffers: transferManager.incomingOffers,
      budget: financeManager.budget,
      allClubs,
      sponsorOffers,
      financialLedger: financeManager.financialLedger,
      trainingHistory: squadManager.trainingHistory,
      injuries: squadManager.injuries,
      listedForSale: transferManager.listedForSale,
      pendingEvent: inboxManager.pendingEvent,
      inbox: inboxManager.inbox,
      activeBoardObjective: seasonManager.activeBoardObjective,
      debt: financeManager.debt,
      staff: squadManager.staff,
      staffPool: squadManager.staffPool,
      cupFixtures: matchManager.cupFixtures,
      cupRound: matchManager.cupRound,
      cupState: matchManager.cupState,
      seasonEndResult: matchManager.seasonEndResult,
      lastTrainingReport: squadManager.lastTrainingReport,
    });
    const ok = autoSave(data);
    if (ok) {
      setLastSaveTime(new Date().toISOString());
    }
  }, [
    gameStarted, playerClub, squadManager.playerSquad, squadManager.allSquads,
    matchManager.standings, matchManager.fixtures, matchManager.currentRound,
    seasonManager.currentDate, seasonManager.season, matchManager.lastMatchResult,
    matchManager.matchHistory, squadManager.trainingFocus, transferManager.transferMarket,
    transferManager.incomingOffers, financeManager.budget, allClubs, sponsorOffers,
    financeManager.financialLedger, squadManager.trainingHistory, squadManager.injuries,
    transferManager.listedForSale, inboxManager.pendingEvent, inboxManager.inbox,
    seasonManager.activeBoardObjective, financeManager.debt, squadManager.staff,
    squadManager.staffPool, matchManager.cupFixtures, matchManager.cupRound,
    matchManager.cupState, matchManager.seasonEndResult, squadManager.lastTrainingReport,
  ]);

  // Auto-save every 3 actions
  const triggerAutoSave = useCallback(() => {
    actionCountRef.current += 1;
    if (actionCountRef.current >= 3) {
      actionCountRef.current = 0;
      performAutoSave();
    }
  }, [performAutoSave]);

  // Force auto-save after specific actions
  useEffect(() => {
    if (forceSaveFlag > 0) {
      const id = setTimeout(() => performAutoSave(), 0);
      return () => clearTimeout(id);
    }
  }, [forceSaveFlag, performAutoSave]);

  const applyLoadedState = useCallback((data: SaveData) => {
    const loadedClubs = (data.allClubs || (clubsData as Club[])).map(c => ({
      ...c,
      youthAcademy: c.youthAcademy || []
    }));
    setAllClubs(loadedClubs);
    const club = loadedClubs.find(c => c.id === data.playerClubId) || loadedClubs[0];
    setPlayerClub(club as Club);

    squadManager.applyLoadedState(data);
    matchManager.applyLoadedState(data);
    transferManager.applyLoadedState(data);
    inboxManager.applyLoadedState(data);
    financeManager.applyLoadedState(data);
    seasonManager.applyLoadedState(data);

    setSponsorOffers(data.sponsorOffers || []);
    setGameStarted(true);
    setLastSaveTime(data.timestamp);
  }, [squadManager, matchManager, transferManager, inboxManager, financeManager, seasonManager]);

  // Save/Load actions
  const saveGame = useCallback(async (slot: number, name?: string): Promise<boolean> => {
    const slotName = name || `Save ${slot}`;
    const data = createSaveData(slotName, {
      playerClub,
      playerSquad: squadManager.playerSquad,
      allSquads: squadManager.allSquads,
      standings: matchManager.standings,
      fixtures: matchManager.fixtures,
      currentRound: matchManager.currentRound,
      currentDate: seasonManager.currentDate,
      season: seasonManager.season,
      lastMatchResult: matchManager.lastMatchResult,
      matchHistory: matchManager.matchHistory,
      trainingFocus: squadManager.trainingFocus,
      transferMarket: transferManager.transferMarket,
      incomingOffers: transferManager.incomingOffers,
      budget: financeManager.budget,
      allClubs,
      sponsorOffers,
      financialLedger: financeManager.financialLedger,
      trainingHistory: squadManager.trainingHistory,
      injuries: squadManager.injuries,
      listedForSale: transferManager.listedForSale,
      pendingEvent: inboxManager.pendingEvent,
      inbox: inboxManager.inbox,
      activeBoardObjective: seasonManager.activeBoardObjective,
      debt: financeManager.debt,
      staff: squadManager.staff,
      staffPool: squadManager.staffPool,
      cupFixtures: matchManager.cupFixtures,
      cupRound: matchManager.cupRound,
      cupState: matchManager.cupState,
      seasonEndResult: matchManager.seasonEndResult,
      lastTrainingReport: squadManager.lastTrainingReport,
    });
    const ok = await saveToSlot(slot, data);
    if (ok) setLastSaveTime(new Date().toISOString());
    return ok;
  }, [
    playerClub, squadManager, matchManager, transferManager, inboxManager,
    financeManager, seasonManager, allClubs, sponsorOffers,
  ]);

  const loadGameFromSlot = useCallback(async (slot: number): Promise<boolean> => {
    const data = await loadFromSlot(slot);
    if (!data) return false;
    applyLoadedState(data);
    return true;
  }, [applyLoadedState]);

  const loadAutosaveAction = useCallback(async (): Promise<boolean> => {
    const data = await loadAutoSave();
    if (!data) return false;
    applyLoadedState(data);
    return true;
  }, [applyLoadedState]);

  const deleteSave = useCallback(async (slot: number) => {
    await deleteSlot(slot);
  }, []);

  const getSaveSlots = useCallback(async (): Promise<(SaveSlotInfo | null)[]> => {
    return await listSaveSlots(allClubs as Club[]);
  }, [allClubs]);

  const hasAutosaveAction = useCallback(async (): Promise<boolean> => {
    return await hasAutoSave();
  }, []);

  const startNewGame = useCallback((
    selectedClubId?: number,
    customClubConfig?: {
      name: string;
      shortName: string;
      colors: { primary: string; secondary: string };
    },
    roadToGlory?: boolean,
    difficulty?: "easy" | "medium" | "hard"
  ) => {
    // Check for custom mod pack
    const modData = localStorage.getItem("footsim_custom_data");
    let initialClubs = clubsData as Club[];

    if (customClubConfig) {
      initialClubs = initialClubs.map(c => {
        if (c.id === 20) {
          return {
            ...c,
            name: customClubConfig.name,
            shortName: customClubConfig.shortName.toUpperCase(),
            colors: customClubConfig.colors,
            reputation: 20,
            budget: 500000,
            wageBudget: 40000,
            infrastructure: 20,
            formation: "4-4-2",
            mentality: "balanced" as const
          };
        }
        return c;
      });
      selectedClubId = 20;
    }

    if (modData) {
      try {
        const parsedMod = JSON.parse(modData);
        if (parsedMod.clubs && Array.isArray(parsedMod.clubs)) {
          initialClubs = parsedMod.clubs;
        }
      } catch (e) {
        console.error("Failed to load mod data, falling back to default.", e);
      }
    }

    // Generate fresh clubs with sponsors
    const freshClubs = initialClubs.map(c => ({
      ...c,
      sponsor: generateSponsor(c as Club),
      youthAcademy: [], // will be populated by squad manager if needed
    }));

    const startingClubIndex = selectedClubId ? freshClubs.findIndex(c => c.id === selectedClubId) : 0;
    const initialClub = startingClubIndex >= 0 ? freshClubs[startingClubIndex] : freshClubs[0];

    const diff = difficulty || "easy";
    initialClub.difficulty = diff;

    if (roadToGlory) {
      initialClub.budget = 50000;
      initialClub.reputation = 10;
      initialClub.infrastructure = 15;
    }

    if (diff === "hard") {
      initialClub.budget = Math.round(initialClub.budget * 0.7);
    } else if (diff === "medium") {
      initialClub.budget = Math.round(initialClub.budget * 0.9);
    }

    setAllClubs(freshClubs);

    const { squads, playerStartingSquad } = squadManager.startNewGame(freshClubs, initialClub, roadToGlory, difficulty, customClubConfig);

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
    setPlayerClub(initialClub);

    const { standings: leagueStandings, fixtures: leagueFixtures } = matchManager.startNewGame(freshClubs, 2026, "2026-03-01");

    seasonManager.startNewGame();
    financeManager.startNewGame(initialClub, roadToGlory);
    transferManager.startNewGame(freshClubs, squads, initialClub.id, playerStartingSquad);
    inboxManager.setInbox([]);
    inboxManager.setPendingEvent(null);
    inboxManager.clearNotification();
    setSponsorOffers([]);
    setGameStarted(true);
    pushToast({ title: "Novo jogo iniciado!", message: `Você assumiu o comando do ${initialClub.name}. Boa sorte, treinador!`, type: "success" });

    // Autosave right after new game
    actionCountRef.current = 0;
    setTimeout(() => {
      const data = createSaveData("Autosave", {
        playerClub: initialClub,
        playerSquad: playerStartingSquad,
        allSquads: squads,
        standings: leagueStandings,
        fixtures: leagueFixtures,
        currentRound: 0,
        currentDate: "2026-03-01",
        season: 2026,
        lastMatchResult: null,
        matchHistory: [],
        trainingFocus: { type: "team" },
        transferMarket: transferManager.transferMarket,
        incomingOffers: transferManager.incomingOffers,
        budget: roadToGlory ? 50000 : initialClub.budget,
        allClubs: freshClubs,
        debt: 0,
      });
      autoSave(data);
    }, 500);
  }, [squadManager, matchManager, seasonManager, financeManager, transferManager, inboxManager, pushToast]);

  const advanceDay = useCallback(() => {
    const oldMonth = new Date(seasonManager.currentDate).getMonth();
    const localDate = new Date(seasonManager.currentDate);
    let localSquads = new Map<number, Player[]>(squadManager.allSquads);
    let localFixtures = [...matchManager.fixtures];
    let localStandings = [...matchManager.standings];
    let localBudget = financeManager.budget;
    const newMatchHistory: MatchResult[] = [];
    let lastMaxRound = matchManager.currentRound;
    const newLedgerEntries: import("../engine/financeEngine").FinancialRecord[] = [];
    const newTransferOffers: import("../engine/transferEngine").TransferOffer[] = [];
    const newInboxMessages: InboxMessage[] = [];
    let stopReason: "match" | "offer" | "none" | "event" = "none";
    let stopDetail = "";
    const maxDays = 60;
    let pendingBoardReview: {
      standingPosition: number;
      points: number;
      recentResults: string[];
      dateStr: string;
    } | null = null;
    let pendingDrama: { target: Player; dateStr: string } | null = null;

    for (let day = 0; day < maxDays; day++) {
      localDate.setDate(localDate.getDate() + 1);
      const dateStr = localDate.toISOString().split("T")[0];
      const localMonth = localDate.getMonth();

      // ── 0. Monthly Board Review Check ──
      if (localMonth !== oldMonth && stopReason === "none") {
        const standingPosition = localStandings.findIndex(s => s.clubId === playerClub.id) + 1;
        const standing = localStandings.find(s => s.clubId === playerClub.id);
        const points = standing ? standing.points : 0;
        const recentResults = newMatchHistory.map(m => `${m.homeGoals}x${m.awayGoals} contra ${m.homeClub.id === playerClub.id ? m.awayClub.shortName : m.homeClub.shortName}`);

        pendingBoardReview = {
          standingPosition: standingPosition || 10,
          points,
          recentResults,
          dateStr
        };
        stopReason = "offer";
        stopDetail = `📧 Relatório Mensal da Diretoria`;
        break;
      }

      // ── 1. Daily Recovery & Injury Decay ──
      localSquads = squadManager.applyDailyRecovery(localSquads, playerClub.id);

      // ── 2. Daily wages (1/30 of monthly) ──
      localBudget = financeManager.advanceDay(localSquads, playerClub.id, localBudget);

      // ── 3. Check for fixtures on this date (league + cup) ──
      const dayFixtures = localFixtures.filter(f => f.date === dateStr && !f.played);
      const cupDayFixtures = matchManager.cupFixtures.filter(f => f.date === dateStr && !f.played);
      const playerHasMatch = dayFixtures.some(f =>
        f.homeClubId === playerClub.id || f.awayClubId === playerClub.id
      );
      const playerHasCupMatch = cupDayFixtures.some(f =>
        f.homeClubId === playerClub.id || f.awayClubId === playerClub.id
      );

      if (playerHasMatch) {
        const aiOnlyFixtures = dayFixtures.filter(f =>
          f.homeClubId !== playerClub.id && f.awayClubId !== playerClub.id
        );
        if (aiOnlyFixtures.length > 0) {
          const result = simulateMatchDay(dateStr, localFixtures, localStandings, allClubs, localSquads, playerClub.id);
          localFixtures = result.fixtures.map(f => {
            if (f.date === dateStr && (f.homeClubId === playerClub.id || f.awayClubId === playerClub.id)) {
              return { ...f, played: false, result: undefined };
            }
            return f;
          });
          localStandings = result.standings;
          localSquads = result.allSquads;
          lastMaxRound = result.maxPlayedRound;
        }
        stopReason = "match";
        stopDetail = `Dia de jogo — ${dayFixtures.find(f => f.homeClubId === playerClub.id || f.awayClubId === playerClub.id)?.homeClubId === playerClub.id ? "Mandante" : "Visitante"}`;
        break;
      }

      if (playerHasCupMatch) {
        stopReason = "match";
        stopDetail = `🏆 Copa do Brasil — Dia de jogo!`;
        break;
      }

      if (dayFixtures.length > 0) {
        const result = simulateMatchDay(dateStr, localFixtures, localStandings, allClubs, localSquads, playerClub.id);
        localFixtures = result.fixtures;
        localStandings = result.standings;
        localSquads = result.allSquads;
        lastMaxRound = result.maxPlayedRound;
      }

      // ── 4. Transfer offers ──
      const isWindowOpen = lastMaxRound <= 5 || (lastMaxRound >= 17 && lastMaxRound <= 22);
      const transferResult = transferManager.advanceDay(
        dateStr, localSquads, allClubs, playerClub.id,
        transferManager.listedForSale, isWindowOpen
      );
      if (transferResult.stopReason) {
        newTransferOffers.push(...transferResult.newOffers);
        stopReason = transferResult.stopReason;
        stopDetail = transferResult.stopDetail;
        localSquads = transferResult.newSquads;
        break;
      }
      newTransferOffers.push(...transferResult.newOffers);
      localSquads = transferResult.newSquads;
      if (transferResult.newMarket.length !== transferManager.transferMarket.length) {
        transferManager.setTransferMarket(transferResult.newMarket);
      }

      // ── 4b/4c/5. Inbox messages & events ──
      const pSquad = localSquads.get(playerClub.id) || [];
      const inboxResult = inboxManager.advanceDay(dateStr, pSquad, squadManager.staff, stopReason, [...inboxManager.inbox, ...newInboxMessages]);
      if (inboxResult.stopReason !== stopReason) {
        stopReason = inboxResult.stopReason;
        stopDetail = inboxResult.stopDetail;
        newInboxMessages.push(...inboxResult.newInboxMessages);
        if (inboxResult.pendingDrama) {
          pendingDrama = inboxResult.pendingDrama;
        }
        break;
      }
      newInboxMessages.push(...inboxResult.newInboxMessages);
      if (inboxResult.pendingDrama) {
        pendingDrama = inboxResult.pendingDrama;
      }
    }

    // ═══ Commit all state at once ═══
    const finalDate = localDate.toISOString().split("T")[0];
    seasonManager.setCurrentDate(finalDate);
    squadManager.setAllSquads(localSquads);
    const updatedPlayerSquad = localSquads.get(playerClub.id);
    if (updatedPlayerSquad) squadManager.setPlayerSquad(updatedPlayerSquad);
    matchManager.setFixtures(localFixtures);
    matchManager.setStandings(localStandings);
    matchManager.setCurrentRound(lastMaxRound);
    financeManager.setBudget(localBudget);

    if (newLedgerEntries.length > 0) financeManager.setFinancialLedger(prev => [...prev, ...newLedgerEntries]);
    if (newTransferOffers.length > 0) {
      transferManager.setIncomingOffers(prev => [...prev.filter(o => o.status === "pending"), ...newTransferOffers]);
    }
    if (newInboxMessages.length > 0) {
      inboxManager.setInbox(prev => [...newInboxMessages, ...prev]);
    }

    // Notification
    if (stopReason !== "none") {
      inboxManager.setNotification(stopReason, stopDetail, finalDate);
    } else {
      inboxManager.setNotification("none", `Avançado até ${finalDate.split("-")[2]}/${finalDate.split("-")[1]}`, finalDate);
    }

    triggerAutoSave();

    if (stopReason === "match") {
      pushToast({ title: "⚽ Dia de jogo!", message: stopDetail, type: "match" });
    } else if (stopReason === "offer") {
      pushToast({ title: "📨 Nova notificação", message: stopDetail, type: "offer" });
    } else if (stopReason === "event") {
      pushToast({ title: "📢 Acontecimento", message: stopDetail, type: "warning" });
    } else {
      pushToast({ title: "📅 Dia avançado", message: `Avançado até ${finalDate.split("-")[2]}/${finalDate.split("-")[1]}`, type: "info" });
    }

    // Generate deferred emails outside the synchronous loop
    if (pendingBoardReview) {
      generateBoardReviewEmail(
        playerClub.name,
        pendingBoardReview.standingPosition,
        pendingBoardReview.points,
        pendingBoardReview.recentResults,
        confidence.value
      ).then(boardReview => {
        if (!boardReview) return;
        let options: InboxMessage["actionOptions"] = undefined;
        if (boardReview.wantsObjective && boardReview.targetPoints && boardReview.gamesLimit) {
          options = [
            {
              id: "accept_board_objective",
              text: `Aceitar desafio: Conquistar ${boardReview.targetPoints} pontos nos próximos ${boardReview.gamesLimit} jogos`,
              replyText: `Entendido. Aceito o desafio e buscarei esses resultados nos próximos ${boardReview.gamesLimit} jogos.`,
              effects: {
                activeObjective: {
                  type: "points_run",
                  targetPoints: boardReview.targetPoints,
                  gamesLimit: boardReview.gamesLimit,
                  gamesPlayed: 0,
                  pointsEarned: 0,
                  description: `Conquistar ${boardReview.targetPoints} pontos nas próximas ${boardReview.gamesLimit} partidas da liga.`
                }
              }
            }
          ];
        }
        const boardMsg: InboxMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sender: "Diretoria",
          subject: boardReview.subject,
          body: boardReview.body,
          date: pendingBoardReview!.dateStr,
          type: "board",
          read: false,
          actionRequired: !!options,
          actionCompleted: false,
          actionOptions: options
        };
        inboxManager.setInbox(prev => [boardMsg, ...prev]);
      }).catch(e => console.error("Erro ao gerar e-mail da diretoria:", e));
    }

    if (pendingDrama) {
      generatePlayerDramaEmail(pendingDrama.target, playerClub.name)
        .then(drama => drama || generateLocalPlayerDramaEmail(pendingDrama!.target, playerClub.name))
        .then(drama => {
          if (!drama) return;
          const target = pendingDrama!.target;
          const isYoungOrReserve = target.age <= 21 || target.currentAbility < 70;
          const actionOptions = drama.options.map(opt => {
            const effects: Record<string, unknown> = {
              playerMoraleChange: { playerId: target.id, change: opt.moraleEffect },
              playerHappinessChange: { playerId: target.id, change: opt.happinessEffect }
            };
            if (opt.id === "option_1") {
              if (isYoungOrReserve) {
                effects.playtimePromise = { matches: 3, playerId: target.id };
              } else {
                effects.wageIncrease = { newWage: Math.round(target.wage * 1.5), playerId: target.id };
              }
            } else if (opt.id === "option_2") {
              if (!isYoungOrReserve) {
                effects.strikeDays = { days: 7, playerId: target.id };
              }
            }
            return {
              id: opt.id,
              text: opt.text,
              replyText: opt.replyText,
              effects
            };
          });
          const dramaMsg: InboxMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: target.name,
            subject: drama.subject,
            body: drama.body,
            date: pendingDrama!.dateStr,
            type: "player",
            read: false,
            actionRequired: true,
            actionCompleted: false,
            actionOptions
          };
          inboxManager.setInbox(prev => [dramaMsg, ...prev]);
        })
        .catch(e => console.error("Erro ao gerar drama do jogador:", e));
    }
  }, [
    seasonManager, squadManager, matchManager, financeManager, transferManager,
    inboxManager, playerClub, allClubs, triggerAutoSave, confidence, pushToast,
  ]);

  const simulatePlayerMatch = useCallback(() => {
    const result = simulateMatchDay(
      seasonManager.currentDate,
      matchManager.fixtures,
      matchManager.standings,
      allClubs,
      squadManager.allSquads,
      playerClub.id
    );

    matchManager.setFixtures(result.fixtures);
    matchManager.setStandings(result.standings);
    matchManager.setCurrentRound(result.maxPlayedRound);
    squadManager.setAllSquads(result.allSquads);
    const updatedPlayerSquad = result.allSquads.get(playerClub.id);
    if (updatedPlayerSquad) squadManager.setPlayerSquad(updatedPlayerSquad);

    if (result.playerMatch) {
      matchManager.setLastMatchResult(result.playerMatch);
      matchManager.setMatchHistory(prev => [...prev, result.playerMatch!]);

      // Match day revenue
      const financeResult = financeManager.simulatePlayerMatch(playerClub, result.isHome, financeManager.budget, seasonManager.currentDate, seasonManager.season);
      if (financeResult.entry) {
        financeManager.setBudget(financeResult.newBudget);
        financeManager.setFinancialLedger(prev => [...prev, financeResult.entry!]);
      }

      // Track active board objective
      const boardResult = seasonManager.checkBoardObjective(seasonManager.activeBoardObjective, result.playerMatch, playerClub);
      if (boardResult.newObjective !== undefined) {
        seasonManager.setActiveBoardObjective(boardResult.newObjective);
      }
      for (const msg of boardResult.messages) {
        inboxManager.setInbox(prev => [{
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...msg,
          date: seasonManager.currentDate,
          read: false,
        }, ...prev]);
      }

      // Check season end
      const endResult = matchManager.checkSeasonEnd(result, allClubs, playerClub, seasonManager.season);
      if (endResult) {
        matchManager.setSeasonEndResult(endResult);
      }
    }

    triggerAutoSave();

    if (result.playerMatch) {
      const { homeGoals, awayGoals, homeClub, awayClub } = result.playerMatch;
      const isHomeClub = homeClub.id === playerClub.id;
      const myGoals = isHomeClub ? homeGoals : awayGoals;
      const oppGoals = isHomeClub ? awayGoals : homeGoals;
      const oppName = isHomeClub ? awayClub.shortName : homeClub.shortName;
      const resultType = myGoals > oppGoals ? "success" : myGoals < oppGoals ? "error" : "warning";
      const title = myGoals > oppGoals ? "✅ Vitória!" : myGoals < oppGoals ? "❌ Derrota" : "🤝 Empate";
      pushToast({ title, message: `${playerClub.shortName} ${myGoals} x ${oppGoals} ${oppName}`, type: resultType });
    }
  }, [
    seasonManager, matchManager, squadManager, financeManager, inboxManager,
    playerClub, allClubs, triggerAutoSave, pushToast,
  ]);

  const setTrainingFocus = useCallback((focus: import("../engine/trainingEngine").TrainingFocus) => {
    squadManager.setTrainingFocus(focus);
  }, [squadManager]);

  const startNewSeason = useCallback(() => {
    if (!matchManager.seasonEndResult) return;

    financeManager.setBudget(prev => prev + matchManager.seasonEndResult!.totalBonus);

    squadManager.startNewSeason(squadManager.allSquads, allClubs, seasonManager.season, playerClub.id);

    const newSeason = seasonManager.season + 1;
    seasonManager.startNewSeason(newSeason);

    const nextClubs = matchManager.seasonEndResult.updatedClubs;
    setAllClubs(nextClubs);

    const nextPlayerClub = nextClubs.find(c => c.id === playerClub.id) || playerClub;
    setPlayerClub(nextPlayerClub);

    matchManager.startNewSeason(nextClubs);

    // Generate new transfer market
    const market = transferManager.refreshTransferMarket(nextClubs, squadManager.allSquads, nextPlayerClub.id, squadManager.playerSquad, []);
    transferManager.setTransferMarket(market.market);
    transferManager.setIncomingOffers([]);
    transferManager.setListedForSale([]);

    triggerAutoSave();
  }, [
    matchManager, squadManager, seasonManager, financeManager, transferManager,
    playerClub, allClubs, triggerAutoSave,
  ]);

  const advanceMonth = useCallback(() => {
    squadManager.advanceMonth(
      squadManager.allSquads, allClubs, playerClub.id, playerClub,
      squadManager.trainingFocus, seasonManager.season, seasonManager.currentDate
    );

    // Financial: monthly sponsor revenue and expenses
    const monthResult = financeManager.advanceMonth(playerClub, financeManager.budget, seasonManager.currentDate, seasonManager.season, financeManager.debt);
    financeManager.setBudget(monthResult.nextBudget);
    financeManager.setDebt(monthResult.nextDebt);
    financeManager.setFinancialLedger(prev => [...prev, ...monthResult.entries]);

    if (monthResult.loanMessage) {
      inboxManager.setInbox(prev => [monthResult.loanMessage!, ...prev]);
    }

    // Youth Academy Development
    if (playerClub.youthAcademy && playerClub.youthAcademy.length > 0) {
      const infra = playerClub.infrastructure || 50;
      const infraBonus = 0.5 + (infra / 100);

      const updatedAcademy = playerClub.youthAcademy.map(youth => {
        const gap = youth.potentialAbility - youth.currentAbility;
        if (gap <= 0) return youth;

        const baseGrowth = Math.max(0.5, gap * 0.08) * infraBonus;
        const newAttrs = { ...youth.attributes } as PlayerAttributes;
        const keys = Object.keys(newAttrs) as (keyof PlayerAttributes)[];
        const focus = youth.trainingFocus || "Geral";

        for (const key of keys) {
          if (key === "goalkeeping" && youth.positionCategory !== "GK") continue;

          let attrGrowth = baseGrowth * 0.15;

          if (focus === "Físico" && (key === "pace" || key === "physical")) {
            attrGrowth += 1.2;
          } else if (focus === "Técnico" && (key === "dribbling" || key === "passing" || (youth.positionCategory === "GK" && key === "goalkeeping"))) {
            attrGrowth += 1.2;
          } else if (focus === "Tático" && (key === "defending" || key === "passing")) {
            attrGrowth += 1.2;
          } else if (focus === "Geral") {
            attrGrowth += 0.3;
          }

          attrGrowth += Math.random() * 0.5;

          newAttrs[key] = Math.max(1, Math.min(99, Math.round(newAttrs[key] + attrGrowth)));
        }

        const newCA = calculateCA(newAttrs, youth.positionCategory);

        return {
          ...youth,
          attributes: newAttrs,
          currentAbility: newCA,
        };
      });

      const updatedClub = { ...playerClub, youthAcademy: updatedAcademy };
      setPlayerClub(updatedClub);
      setAllClubs(prev => prev.map(c => c.id === playerClub.id ? updatedClub : c));
    }

    // Monthly chance of scouting a new youth talent
    if ((playerClub.youthAcademy?.length || 0) < 6 && Math.random() < 0.20) {
      const newYouths = generateYouthPlayers(playerClub, 1);
      if (newYouths.length > 0) {
        const updatedAcademy = [...(playerClub.youthAcademy || []), newYouths[0]];
        const updatedClub = { ...playerClub, youthAcademy: updatedAcademy };
        setPlayerClub(updatedClub);
        setAllClubs(prev => prev.map(c => c.id === playerClub.id ? updatedClub : c));

        inboxManager.setNotification("event", `🌱 Um novo garoto (${newYouths[0].name}, ${newYouths[0].position}) ingressou nas categorias de base!`, seasonManager.currentDate);
      }
    }

    // Update playerClub reference so UI updates
    const updatedPlayerClub = { ...playerClub };
    setPlayerClub(updatedPlayerClub);
    setAllClubs(prev => prev.map(c => c.id === playerClub.id ? updatedPlayerClub : c));

    triggerAutoSave();
  }, [
    squadManager, financeManager, inboxManager, playerClub, allClubs,
    seasonManager, triggerAutoSave,
  ]);

  const upgradeInfrastructure = useCallback((): boolean => {
    const cost = 2_000_000;
    if (financeManager.budget < cost) return false;
    if (playerClub.infrastructure >= 95) return false;

    const newInfra = Math.min(95, playerClub.infrastructure + 5);
    const updatedClub = { ...playerClub, infrastructure: newInfra };
    setPlayerClub(updatedClub);
    setAllClubs(prev => prev.map(c => c.id === playerClub.id ? updatedClub : c));
    financeManager.setBudget(prev => prev - cost);
    financeManager.setFinancialLedger(prev => [...prev, {
      month: new Date(seasonManager.currentDate).getMonth() + 1,
      season: seasonManager.season,
      type: "expense" as const,
      category: "wages" as const,
      description: `Upgrade Infraestrutura (${playerClub.infrastructure} → ${newInfra})`,
      amount: cost,
    }]);
    triggerAutoSave();
    return true;
  }, [financeManager, playerClub, seasonManager, triggerAutoSave]);

  const listForSale = useCallback((playerId: number) => {
    transferManager.listForSale(playerId);
  }, [transferManager]);

  const unlistForSale = useCallback((playerId: number) => {
    transferManager.unlistForSale(playerId);
  }, [transferManager]);

  const hireStaff = useCallback((id: number) => {
    const result = squadManager.hireStaff(id, financeManager.budget);
    if (!result.success || !result.member) return;
    financeManager.setBudget(prev => prev - result.cost);
    financeManager.setFinancialLedger(prev => [...prev, {
      month: new Date(seasonManager.currentDate).getMonth() + 1,
      season: seasonManager.season,
      type: "expense" as const,
      category: "staff" as const,
      description: `Contratação: ${result.member.name} (${result.member.role})`,
      amount: result.cost,
    }]);
    triggerAutoSave();
  }, [squadManager, financeManager, seasonManager, triggerAutoSave]);

  const fireStaff = useCallback((id: number) => {
    const result = squadManager.fireStaff(id);
    if (!result.success || !result.member) return;
    financeManager.setBudget(prev => prev - result.cost);
    triggerAutoSave();
  }, [squadManager, financeManager, triggerAutoSave]);

  const refreshTransferMarket = useCallback(() => {
    transferManager.refreshTransferMarket(allClubs as Club[], squadManager.allSquads, playerClub.id, squadManager.playerSquad, transferManager.listedForSale);
  }, [transferManager, allClubs, squadManager, playerClub]);

  const makeOffer = useCallback((listingIndex: number, offerAmount: number): "accepted" | "rejected" | "counter" => {
    const result = transferManager.makeOffer(listingIndex, offerAmount, transferManager.transferMarket, financeManager.budget);

    if (result.result === "accepted" && result.newPlayer && result.listing) {
      const newPlayer = result.newPlayer;
      const listing = result.listing;
      squadManager.setPlayerSquad((prev: Player[]) => [...prev, newPlayer]);
      squadManager.setAllSquads(prevSquads => {
        const newSquads = new Map(prevSquads);
        const mySquad = newSquads.get(playerClub.id) || [];
        newSquads.set(playerClub.id, [...mySquad, newPlayer]);
        if (listing.sellerClubId !== null) {
          const sellerSquad = newSquads.get(listing.sellerClubId);
          if (sellerSquad) {
            newSquads.set(listing.sellerClubId, sellerSquad.filter(p => p.id !== newPlayer.id));
          }
        }
        return newSquads;
      });

      if (listing.sellerClubId !== null) {
        setAllClubs(prevClubs => prevClubs.map(c => {
          if (c.id === listing.sellerClubId && c.startingLineup) {
            return { ...c, startingLineup: c.startingLineup.filter(id => id !== newPlayer.id) };
          }
          return c;
        }));
      }

      financeManager.setBudget(result.newBudget!);
      financeManager.setFinancialLedger(prev => [...prev, {
        month: new Date(seasonManager.currentDate).getMonth() + 1,
        season: seasonManager.season,
        type: "expense" as const,
        category: "transfer_out" as const,
        description: `Contratação: ${newPlayer.name} (${listing.sellerClubName})`,
        amount: offerAmount,
      }]);
      transferManager.setTransferMarket(result.newMarket!);
      triggerAutoSave();
    } else if (result.result === "counter" && result.newMarket) {
      transferManager.setTransferMarket(result.newMarket);
    }

    return result.result;
  }, [transferManager, financeManager, playerClub, seasonManager, squadManager, triggerAutoSave]);

  const makeTransferOffer = useCallback((player: Player, fromClubId: number, amount: number) => {
    const newPlayer = { ...player, seasonStats: player.seasonStats || createEmptyStats() };
    squadManager.setPlayerSquad(prev => [...prev, newPlayer]);
    squadManager.setAllSquads(prevSquads => {
      const newSquads = new Map(prevSquads);
      const mySquad = newSquads.get(playerClub.id) || [];
      newSquads.set(playerClub.id, [...mySquad, newPlayer]);
      const sellerSquad = newSquads.get(fromClubId);
      if (sellerSquad) {
        newSquads.set(fromClubId, sellerSquad.filter(p => p.id !== player.id));
      }
      return newSquads;
    });

    setAllClubs(prevClubs => prevClubs.map(c => {
      if (c.id === fromClubId && c.startingLineup) {
        return { ...c, startingLineup: c.startingLineup.filter(id => id !== player.id) };
      }
      return c;
    }));

    financeManager.setBudget(prev => prev - amount);
    const fromClub = allClubs.find(c => c.id === fromClubId);
    financeManager.setFinancialLedger(prev => [...prev, {
      month: new Date(seasonManager.currentDate).getMonth() + 1,
      season: seasonManager.season,
      type: "expense" as const,
      category: "transfer_out" as const,
      description: `Contratação: ${player.name} (${fromClub?.shortName || "???"})`,
      amount,
    }]);
    triggerAutoSave();
  }, [squadManager, playerClub, allClubs, financeManager, seasonManager, triggerAutoSave]);

  const addPackPlayers = useCallback((players: Player[], cost: number = 0) => {
    if (!players || players.length === 0) return;
    const withStats = players.map(p => ({
      ...p,
      seasonStats: p.seasonStats || createEmptyStats(),
      careerHistory: p.careerHistory || [],
    }));
    squadManager.setPlayerSquad(prev => [...prev, ...withStats]);
    squadManager.setAllSquads(prev => {
      const next = new Map(prev);
      const mine = next.get(playerClub.id) || [];
      next.set(playerClub.id, [...mine, ...withStats]);
      return next;
    });

    if (cost > 0) {
      financeManager.setBudget(prev => prev - cost);
      financeManager.setFinancialLedger(prev => [...prev, {
        month: new Date(seasonManager.currentDate).getMonth() + 1,
        season: seasonManager.season,
        type: "expense" as const,
        category: "transfer_out" as const,
        description: `Compra de Pacote Scout`,
        amount: cost,
      }]);
    }

    setForceSaveFlag(Date.now());
  }, [squadManager, playerClub, financeManager, seasonManager]);

  const respondToOffer = useCallback((offerId: number, accept: boolean) => {
    const result = transferManager.respondToOffer(offerId, accept, transferManager.incomingOffers, squadManager.playerSquad);
    if (!result.success) return;

    if (result.stale) {
      transferManager.setIncomingOffers(result.nextOffers!);
      return;
    }

    if (accept && result.offer && result.currentPlayer) {
      squadManager.setPlayerSquad(ps => ps.filter(p => p.id !== result.currentPlayer!.id));
      squadManager.setAllSquads(prevSquads => {
        const newSquads = new Map(prevSquads);
        const mySquad = newSquads.get(playerClub.id);
        if (mySquad) {
          newSquads.set(playerClub.id, mySquad.filter(p => p.id !== result.currentPlayer!.id));
        }
        const buyerSquad = newSquads.get(result.offer!.fromClubId) || [];
        newSquads.set(result.offer!.fromClubId, [...buyerSquad, result.currentPlayer!]);
        return newSquads;
      });

      setPlayerClub(prev => {
        if (!prev.startingLineup) return prev;
        return { ...prev, startingLineup: prev.startingLineup.filter(id => id !== result.offer!.player.id) };
      });

      setAllClubs(prevClubs => prevClubs.map(c => {
        if (c.id === playerClub.id && c.startingLineup) {
          return { ...c, startingLineup: c.startingLineup.filter(id => id !== result.offer!.player.id) };
        }
        return c;
      }));

      financeManager.setBudget(b => b + result.offer!.offerAmount);
      financeManager.setFinancialLedger(prev => [...prev, {
        month: new Date(seasonManager.currentDate).getMonth() + 1,
        season: seasonManager.season,
        type: "income" as const,
        category: "transfer_in" as const,
        description: `Venda: ${result.offer!.player.name} → ${result.offer!.fromClubName}`,
        amount: result.offer!.offerAmount,
      }]);

      transferManager.setIncomingOffers(result.nextOffers!);
      triggerAutoSave();
    } else {
      transferManager.setIncomingOffers(result.nextOffers!);
    }
  }, [transferManager, squadManager, playerClub, financeManager, seasonManager, triggerAutoSave]);

  const updateStartingLineup = useCallback((newLineupIds: number[]) => {
    setPlayerClub(prev => ({
      ...prev,
      startingLineup: newLineupIds,
    }));
    setAllClubs(prev => prev.map(c =>
      c.id === playerClub.id ? { ...c, startingLineup: newLineupIds } : c
    ));
    setForceSaveFlag(prev => prev + 1);
  }, [playerClub]);

  const updateTactics = useCallback((formation: string, mentality: "defensive" | "balanced" | "attacking") => {
    setPlayerClub(prev => ({
      ...prev,
      formation,
      mentality,
    }));
    setAllClubs(prev => prev.map(c =>
      c.id === playerClub.id ? { ...c, formation, mentality } : c
    ));
    setForceSaveFlag(prev => prev + 1);
  }, [playerClub.id]);

  const searchSponsors = useCallback(() => {
    const newOffers: Sponsor[] = [
      generateSponsor(playerClub),
      generateSponsor(playerClub),
      generateSponsor(playerClub),
    ];
    setSponsorOffers(newOffers);
    triggerAutoSave();
  }, [playerClub, triggerAutoSave]);

  const acceptSponsor = useCallback((sponsor: Sponsor) => {
    setPlayerClub(prev => ({ ...prev, sponsor }));
    setAllClubs(prevClubs => prevClubs.map(c =>
      c.id === playerClub.id ? { ...c, sponsor } : c
    ));
    setSponsorOffers([]);
    const bonus = sponsor.monthlyValue;
    financeManager.setBudget(b => b + bonus);
    financeManager.setFinancialLedger(prev => [...prev, {
      month: new Date(seasonManager.currentDate).getMonth() + 1,
      season: seasonManager.season,
      type: "income" as const,
      category: "sponsor" as const,
      description: `Bônus de Assinatura: ${sponsor.name}`,
      amount: bonus,
    }]);
    triggerAutoSave();
  }, [playerClub.id, financeManager, seasonManager, triggerAutoSave]);

  const chooseEventOption = useCallback((optionIndex: number) => {
    if (!inboxManager.pendingEvent) return;
    const option = inboxManager.pendingEvent.options[optionIndex];
    if (!option) return;

    let localSquad = [...squadManager.playerSquad];
    let localBudget = financeManager.budget;
    const effects = option.effects;

    if (effects.budgetChange) {
      localBudget += effects.budgetChange;
    }

    if (effects.moraleChange) {
      localSquad = localSquad.map(p => ({
        ...p,
        morale: Math.max(20, Math.min(100, p.morale + (effects.moraleChange || 0)))
      }));
    }

    if (effects.boardConfidenceChange) {
      adjustBoardConfidence(effects.boardConfidenceChange, `Evento: ${inboxManager.pendingEvent.title}`);
    }

    if (effects.playerMoralChange) {
      const { target, value } = effects.playerMoralChange;
      let targetPlayer: Player | undefined;
      if (target === "star") {
        targetPlayer = [...localSquad].sort((a, b) => b.currentAbility - a.currentAbility)[0];
      } else if (target === "reserve") {
        targetPlayer = [...localSquad].sort((a, b) => a.currentAbility - b.currentAbility)[0];
      } else {
        targetPlayer = localSquad[Math.floor(Math.random() * localSquad.length)];
      }
      if (targetPlayer) {
        const targetId = targetPlayer.id;
        localSquad = localSquad.map(p => p.id === targetId ? { ...p, morale: Math.max(20, Math.min(100, p.morale + value)) } : p);
      }
    }

    if (effects.xpBoost) {
      const { target, value } = effects.xpBoost;
      if (target === "all") {
        localSquad = localSquad.map(p => {
          if (p.rpg) {
            const res = addXP(p.rpg, value);
            const attrs = { ...p.attributes } as PlayerAttributes;
            if (res.pointsToDistribute > 0) {
              const keys = Object.keys(attrs) as (keyof PlayerAttributes)[];
              for (let i = 0; i < res.pointsToDistribute; i++) {
                const k = keys[Math.floor(Math.random() * keys.length)];
                attrs[k] = Math.min(99, attrs[k] + 1);
              }
            }
            return {
              ...p,
              rpg: res.rpg,
              attributes: attrs,
              currentAbility: calculateCA(attrs, p.positionCategory)
            };
          }
          return p;
        });
      } else {
        const targetPlayer = localSquad[Math.floor(Math.random() * localSquad.length)];
        if (targetPlayer && targetPlayer.rpg) {
          const targetId = targetPlayer.id;
          localSquad = localSquad.map(p => {
            if (p.id === targetId && p.rpg) {
              const res = addXP(p.rpg, value);
              const attrs = { ...p.attributes } as PlayerAttributes;
              if (res.pointsToDistribute > 0) {
                const keys = Object.keys(attrs) as (keyof PlayerAttributes)[];
                for (let i = 0; i < res.pointsToDistribute; i++) {
                  const k = keys[Math.floor(Math.random() * keys.length)];
                  attrs[k] = Math.min(99, attrs[k] + 1);
                }
              }
              return {
                ...p,
                rpg: res.rpg,
                attributes: attrs,
                currentAbility: calculateCA(attrs, p.positionCategory)
              };
            }
            return p;
          });
        }
      }
    }

    if (effects.injuryPlayer && Math.random() < effects.injuryPlayer.probability) {
      const targetPlayer = localSquad[Math.floor(Math.random() * localSquad.length)];
      if (targetPlayer) {
        const targetId = targetPlayer.id;
        const duration = Math.floor(Math.random() * effects.injuryPlayer.maxDuration) + 3;
        localSquad = localSquad.map(p => p.id === targetId ? { ...p, injuryDays: duration, fitness: Math.max(30, p.fitness - 15) } : p);
        squadManager.setInjuries(prev => [
          ...prev,
          {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            position: targetPlayer.position,
            type: "Lesão em Treino (Evento)",
            weeksRemaining: Math.ceil(duration / 7),
            severity: duration > 10 ? "moderate" : "minor"
          }
        ]);
      }
    }

    inboxManager.setPendingEvent(null);
    squadManager.setPlayerSquad(localSquad);
    financeManager.setBudget(localBudget);
    squadManager.setAllSquads(prev => {
      const next = new Map(prev);
      next.set(playerClub.id, localSquad);
      return next;
    });

    setForceSaveFlag(prev => prev + 1);
  }, [inboxManager, squadManager, financeManager, playerClub.id, adjustBoardConfidence]);

  const promoteYouthPlayer = useCallback((playerId: number) => {
    if (!playerClub.youthAcademy) return;
    const promoted = playerClub.youthAcademy.find(p => p.id === playerId);
    if (!promoted) return;

    const firstTeamPlayer: Player = {
      ...promoted,
      wage: Math.round(promoted.currentAbility * 150),
      shirtNumber: squadManager.playerSquad.length + 1,
    };

    const updatedAcademy = (playerClub.youthAcademy || []).filter(p => p.id !== playerId);
    const updatedClub = { ...playerClub, youthAcademy: updatedAcademy };
    setPlayerClub(updatedClub);
    setAllClubs(prev => prev.map(c => c.id === playerClub.id ? updatedClub : c));

    const nextSquad = [...squadManager.playerSquad, firstTeamPlayer];
    squadManager.setPlayerSquad(nextSquad);
    squadManager.setAllSquads(prev => {
      const next = new Map(prev);
      next.set(playerClub.id, nextSquad);
      return next;
    });

    inboxManager.setNotification("event", `🌱 ${firstTeamPlayer.name} (${firstTeamPlayer.position}) subiu da base para o time principal!`, seasonManager.currentDate);
    setForceSaveFlag(prev => prev + 1);
  }, [playerClub, squadManager, inboxManager, seasonManager]);

  const changeYouthFocus = useCallback((playerId: number, focus: string) => {
    const updatedAcademy = (playerClub.youthAcademy || []).map(p =>
      p.id === playerId ? { ...p, trainingFocus: focus as Player["trainingFocus"] } : p
    );
    const updatedClub = { ...playerClub, youthAcademy: updatedAcademy };
    setPlayerClub(updatedClub);
    setAllClubs(prev => prev.map(c =>
      c.id === playerClub.id ? updatedClub : c
    ));
    setForceSaveFlag(prev => prev + 1);
  }, [playerClub]);

  const addInboxMessage = useCallback((
    sender: string,
    subject: string,
    body: string,
    type: InboxMessage["type"],
    options?: InboxMessage["actionOptions"]
  ) => {
    inboxManager.addInboxMessage(sender, subject, body, type, seasonManager.currentDate, options);
  }, [inboxManager, seasonManager.currentDate]);

  const markMessageRead = useCallback((messageId: string) => {
    inboxManager.markMessageRead(messageId);
  }, [inboxManager]);

  const replyToMessage = useCallback((messageId: string, optionId: string) => {
    inboxManager.replyToMessage(messageId, optionId, {
      playerSquad: squadManager.playerSquad,
      staff: squadManager.staff,
      budget: financeManager.budget,
      playerClubId: playerClub.id,
      setPlayerSquad: squadManager.setPlayerSquad,
      setAllSquads: squadManager.setAllSquads,
      setBudget: financeManager.setBudget,
      setStaff: squadManager.setStaff,
      setActiveBoardObjective: seasonManager.setActiveBoardObjective,
      adjustBoardConfidence,
    });
  }, [inboxManager, squadManager, financeManager, playerClub.id, seasonManager, adjustBoardConfidence]);

  const generatePlayerScoutReport = useCallback(async (playerId: number): Promise<string | null> => {
    if (playerClub.scoutReports && playerClub.scoutReports[playerId]) {
      return playerClub.scoutReports[playerId];
    }

    let targetPlayer = squadManager.playerSquad.find(p => p.id === playerId);
    if (!targetPlayer) {
      for (const [, squad] of squadManager.allSquads) {
        const found = squad.find(p => p.id === playerId);
        if (found) {
          targetPlayer = found;
          break;
        }
      }
    }

    if (!targetPlayer) return null;
    if (financeManager.budget < 5000) return null;

    const reportText = await generateScoutReport(targetPlayer);
    if (reportText) {
      financeManager.setBudget(b => b - 5000);
      financeManager.setFinancialLedger(prev => [...prev, {
        month: new Date(seasonManager.currentDate).getMonth() + 1,
        season: seasonManager.season,
        type: "expense" as const,
        category: "staff" as const,
        description: `Observador: Relatório de ${targetPlayer!.name}`,
        amount: 5000,
      }]);
      setPlayerClub(prev => {
        const reports = { ...(prev.scoutReports || {}), [playerId]: reportText };
        const updated = { ...prev, scoutReports: reports };
        setAllClubs(clubs => clubs.map(c => c.id === prev.id ? updated : c));
        return updated;
      });
      triggerAutoSave();
      return reportText;
    }
    return null;
  }, [playerClub, squadManager, financeManager, seasonManager, triggerAutoSave]);

  const payOffDebt = useCallback((amount: number) => {
    financeManager.payOffDebt(amount, financeManager.budget, financeManager.debt, seasonManager.currentDate, seasonManager.season);
    setForceSaveFlag(prev => prev + 1);
  }, [financeManager, seasonManager]);

  const advanceCupAfterMatch = useCallback(() => {
    matchManager.advanceCup();
    triggerAutoSave();
  }, [matchManager, triggerAutoSave]);

  return (
    <GameContext.Provider value={{
      playerClub,
      playerSquad: squadManager.playerSquad,
      allClubs,
      allSquads: squadManager.allSquads,
      standings: matchManager.standings,
      fixtures: matchManager.fixtures,
      currentRound: matchManager.currentRound,
      currentDate: seasonManager.currentDate,
      season: seasonManager.season,
      lastMatchResult: matchManager.lastMatchResult,
      matchHistory: matchManager.matchHistory,
      trainingFocus: squadManager.trainingFocus,
      transferMarket: transferManager.transferMarket,
      incomingOffers: transferManager.incomingOffers,
      budget: financeManager.budget,
      gameStarted,
      lastSaveTime,
      saveGame,
      loadGame: loadGameFromSlot,
      loadAutosave: loadAutosaveAction,
      deleteSave,
      getSaveSlots,
      hasAutosave: hasAutosaveAction,
      startNewGame,
      advanceDay,
      simulatePlayerMatch,
      setTrainingFocus,
      advanceMonth,
      refreshTransferMarket,
      makeOffer,
      respondToOffer,
      updateStartingLineup,
      updateTactics,
      seasonEndResult: matchManager.seasonEndResult,
      startNewSeason,
      lastTrainingReport: squadManager.lastTrainingReport,
      trainingHistory: squadManager.trainingHistory,
      injuries: squadManager.injuries,
      financialLedger: financeManager.financialLedger,
      upgradeInfrastructure,
      listedForSale: transferManager.listedForSale,
      listForSale,
      unlistForSale,
      sponsorOffers,
      searchSponsors,
      acceptSponsor,
      staff: squadManager.staff,
      staffPool: squadManager.staffPool,
      hireStaff,
      fireStaff,
      makeTransferOffer,
      addPackPlayers,
      cupState: matchManager.cupState,
      cupFixtures: matchManager.cupFixtures,
      cupRound: matchManager.cupRound,
      advanceCupAfterMatch,
      isTransferWindowOpen,
      lastNotification: inboxManager.lastNotification,
      clearNotification: inboxManager.clearNotification,
      pendingEvent: inboxManager.pendingEvent,
      chooseEventOption,
      promoteYouthPlayer,
      changeYouthFocus,
      inbox: inboxManager.inbox,
      activeBoardObjective: seasonManager.activeBoardObjective,
      addInboxMessage,
      markMessageRead,
      replyToMessage,
      generatePlayerScoutReport,
      debt: financeManager.debt,
      setDebt: financeManager.setDebt,
      payOffDebt,
    }}>
      {children}
    </GameContext.Provider>
  );
}
