import type { Player, Club } from "../types/game";
import type { MatchResult } from "./matchEngine";
import type { LeagueStanding, Fixture } from "./leagueEngine";
import type { TrainingFocus } from "./trainingEngine";
import type { TransferListing, TransferOffer } from "./transferEngine";

const SAVE_PREFIX = "footsim_save_";
const AUTOSAVE_KEY = "footsim_autosave";
const MAX_SLOTS = 3;

export interface SaveData {
  version: 1;
  timestamp: string;
  slotName: string;

  playerClubId: number;
  playerSquad: Player[];
  allSquadsEntries: [number, Player[]][];
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
  allClubs?: Club[];
}

export interface SaveSlotInfo {
  slot: number;
  key: string;
  name: string;
  timestamp: string;
  season: number;
  round: number;
  clubName: string;
  position: number;
}

export function createSaveData(
  slotName: string,
  state: {
    playerClub: Club;
    playerSquad: Player[];
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
    allClubs: Club[];
  },
): SaveData {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    slotName,

    playerClubId: state.playerClub.id,
    playerSquad: state.playerSquad,
    allSquadsEntries: Array.from(state.allSquads.entries()),
    standings: state.standings,
    fixtures: state.fixtures,
    currentRound: state.currentRound,
    currentDate: state.currentDate,
    season: state.season,
    lastMatchResult: state.lastMatchResult,
    matchHistory: state.matchHistory,
    trainingFocus: state.trainingFocus,
    transferMarket: state.transferMarket,
    incomingOffers: state.incomingOffers,
    budget: state.budget,
    allClubs: state.allClubs,
  };
}

export function saveToSlot(slot: number, data: SaveData): boolean {
  try {
    const key = `${SAVE_PREFIX}${slot}`;
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);
    return true;
  } catch (e) {
    console.error("Failed to save:", e);
    return false;
  }
}

export function autoSave(data: SaveData): boolean {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(AUTOSAVE_KEY, json);
    return true;
  } catch (e) {
    console.error("Autosave failed:", e);
    return false;
  }
}

export function loadFromSlot(slot: number): SaveData | null {
  try {
    const key = `${SAVE_PREFIX}${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch (e) {
    console.error("Failed to load save:", e);
    return null;
  }
}

export function loadAutoSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch (e) {
    console.error("Failed to load autosave:", e);
    return null;
  }
}

export function deleteSlot(slot: number): void {
  localStorage.removeItem(`${SAVE_PREFIX}${slot}`);
}

export function listSaveSlots(clubs: Club[]): (SaveSlotInfo | null)[] {
  const slots: (SaveSlotInfo | null)[] = [];

  for (let i = 1; i <= MAX_SLOTS; i++) {
    const data = loadFromSlot(i);
    if (!data) {
      slots.push(null);
      continue;
    }

    const club = clubs.find(c => c.id === data.playerClubId);
    const position = data.standings.findIndex(s => s.clubId === data.playerClubId) + 1;

    slots.push({
      slot: i,
      key: `${SAVE_PREFIX}${i}`,
      name: data.slotName,
      timestamp: data.timestamp,
      season: data.season,
      round: data.currentRound,
      clubName: club?.name || "Unknown",
      position: position || 0,
    });
  }

  return slots;
}

export function hasAutoSave(): boolean {
  return localStorage.getItem(AUTOSAVE_KEY) !== null;
}
