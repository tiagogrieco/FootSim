import type { Player, Club, PreferredFoot, Personality, Sponsor, GameEvent, InboxMessage, BoardObjective } from "../types/game";
import type { StaffMember } from "../types/staff";
import type { CupState } from "./cupEngine";
import type { SeasonEndResult } from "./seasonEngine";
import type { MatchResult } from "./matchEngine";
import type { LeagueStanding, Fixture } from "./leagueEngine";
import type { TrainingFocus, TrainingReport, Injury } from "./trainingEngine";
import type { TransferListing, TransferOffer } from "./transferEngine";
import type { FinancialRecord } from "./financeEngine";

const FEET: PreferredFoot[] = ["right", "right", "right", "right", "right", "right", "right", "left", "left", "both"];
const PERS: Personality[] = ["professional", "professional", "determined", "determined", "leader", "lazy", "temperamental"];

function migratePlayer(p: Player): Player {
  return {
    ...p,
    preferredFoot: p.preferredFoot ?? FEET[Math.floor(Math.random() * FEET.length)],
    personality: p.personality ?? PERS[Math.floor(Math.random() * PERS.length)],
    form: p.form ?? 50,
  };
}

function migrateSave(data: SaveData): SaveData {
  data.playerSquad = data.playerSquad.map(migratePlayer);
  data.allSquadsEntries = data.allSquadsEntries.map(([id, squad]) => [id, squad.map(migratePlayer)]);
  return data;
}

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
  sponsorOffers?: Sponsor[];
  financialLedger?: FinancialRecord[];
  trainingHistory?: TrainingReport[];
  injuries?: Injury[];
  listedForSale?: number[];
  pendingEvent?: GameEvent | null;
  inbox?: InboxMessage[];
  activeBoardObjective?: BoardObjective | null;
  debt?: number;
  staff?: StaffMember[];
  staffPool?: StaffMember[];
  cupFixtures?: Fixture[];
  cupRound?: number;
  cupState?: CupState;
  seasonEndResult?: SeasonEndResult | null;
  lastTrainingReport?: import("./trainingEngine").TrainingReport | null;
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
    sponsorOffers?: Sponsor[];
    financialLedger?: FinancialRecord[];
    trainingHistory?: TrainingReport[];
    injuries?: Injury[];
    listedForSale?: number[];
    pendingEvent?: GameEvent | null;
    inbox?: InboxMessage[];
    activeBoardObjective?: BoardObjective | null;
    debt: number;
    staff?: StaffMember[];
    staffPool?: StaffMember[];
    cupFixtures?: Fixture[];
    cupRound?: number;
    cupState?: CupState;
    seasonEndResult?: SeasonEndResult | null;
    lastTrainingReport?: import("./trainingEngine").TrainingReport | null;
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
    sponsorOffers: state.sponsorOffers || [],
    financialLedger: state.financialLedger || [],
    trainingHistory: state.trainingHistory || [],
    injuries: state.injuries || [],
    listedForSale: state.listedForSale || [],
    pendingEvent: state.pendingEvent || null,
    inbox: state.inbox || [],
    activeBoardObjective: state.activeBoardObjective || null,
    debt: state.debt,
    staff: state.staff,
    staffPool: state.staffPool,
    cupFixtures: state.cupFixtures,
    cupRound: state.cupRound,
    cupState: state.cupState,
    seasonEndResult: state.seasonEndResult,
    lastTrainingReport: state.lastTrainingReport,
  };
}

import { supabase } from "../lib/supabase";

export async function saveToSlot(slot: number, data: SaveData): Promise<boolean> {
  try {
    const key = `${SAVE_PREFIX}${slot}`;
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);

    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { error } = await supabase.from('save_slots').upsert({
        user_id: userData.user.id,
        slot_number: slot,
        slot_name: data.slotName,
        save_data: data,
        timestamp: new Date().toISOString(),
      }, { onConflict: 'user_id, slot_number' });

      if (error) console.error("Cloud save failed:", error);
    }
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

export async function loadFromSlot(slot: number): Promise<SaveData | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data, error } = await supabase
        .from('save_slots')
        .select('save_data')
        .eq('user_id', userData.user.id)
        .eq('slot_number', slot)
        .single();
      
      if (!error && data?.save_data) {
        return migrateSave(data.save_data as SaveData);
      }
    }

    // Fallback local
    const key = `${SAVE_PREFIX}${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw) as SaveData);
  } catch (e) {
    console.error("Failed to load save:", e);
    return null;
  }
}

export function loadAutoSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw) as SaveData);
  } catch (e) {
    console.error("Failed to load autosave:", e);
    return null;
  }
}

export async function deleteSlot(slot: number): Promise<void> {
  localStorage.removeItem(`${SAVE_PREFIX}${slot}`);
  
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    await supabase.from('save_slots')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('slot_number', slot);
  }
}

export async function listSaveSlots(clubs: Club[]): Promise<(SaveSlotInfo | null)[]> {
  const slots: (SaveSlotInfo | null)[] = Array(MAX_SLOTS).fill(null);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const cloudSaves: Record<number, unknown> = {};

    if (userData?.user) {
      const { data, error } = await supabase
        .from('save_slots')
        .select('slot_number, slot_name, timestamp, save_data')
        .eq('user_id', userData.user.id);
        
      if (!error && data) {
        data.forEach(row => {
          cloudSaves[row.slot_number] = row.save_data;
        });
      }
    }

    for (let i = 1; i <= MAX_SLOTS; i++) {
      let data: SaveData | null = null;

      // Try cloud first
      if (cloudSaves[i]) {
        data = cloudSaves[i] as SaveData;
      } else {
        // Fallback local
        const key = `${SAVE_PREFIX}${i}`;
        const raw = localStorage.getItem(key);
        if (raw) data = JSON.parse(raw) as SaveData;
      }

      if (!data) continue;

      const club = clubs.find(c => c.id === data!.playerClubId);
      const position = data.standings.findIndex(s => s.clubId === data!.playerClubId) + 1;

      slots[i - 1] = {
        slot: i,
        key: `${SAVE_PREFIX}${i}`,
        name: data.slotName,
        timestamp: data.timestamp,
        season: data.season,
        round: data.currentRound,
        clubName: club?.name || "Unknown",
        position: position || 0,
      };
    }
  } catch (e) {
    console.error("Failed to list save slots:", e);
  }

  return slots;
}

export function hasAutoSave(): boolean {
  return localStorage.getItem(AUTOSAVE_KEY) !== null;
}

