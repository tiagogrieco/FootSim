/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { MatchResult } from "../engine/matchEngine";
import type { Player, Club } from "../types/game";
import type { HoFState, ClubRecord, TrophyType, Trophy } from "../types/hallOfFame";
import { EMPTY_HOF } from "../types/hallOfFame";
import {
  ensureClub,
  recordMatch,
  syncLegendsFromSquad,
  awardTrophy,
  recordSeasonEnd,
} from "../engine/hallOfFameEngine";

const STORAGE_KEY = "footsim_hof_v1";

function load(): HoFState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_HOF;
    return { ...EMPTY_HOF, ...JSON.parse(raw) } as HoFState;
  } catch { return EMPTY_HOF; }
}
function persist(s: HoFState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* */ }
}

interface HoFContextType {
  state: HoFState;
  currentClubHoF: HoFState["byClub"][number] | null;
  brokenRecordToast: ClubRecord[];
  setActiveClub: (club: Club) => void;
  trackMatch: (match: MatchResult, playerClubId: number, season: number) => void;
  syncSquadLegends: (squad: Player[], clubId: number, season: number) => void;
  awardClubTrophy: (clubId: number, info: { name: string; competition: string; type: TrophyType; icon: string; rarity: Trophy["rarity"] }, season: number) => void;
  finalizeSeasonRecords: (clubId: number, squad: Player[], season: number) => void;
  dismissBrokenToast: () => void;
  resetHoF: () => void;
}

const HoFContext = createContext<HoFContextType | null>(null);
export function useHallOfFame() {
  const c = useContext(HoFContext);
  if (!c) throw new Error("useHallOfFame must be inside HallOfFameProvider");
  return c;
}

export function HallOfFameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HoFState>(() => load());
  const [brokenRecordToast, setBrokenRecordToast] = useState<ClubRecord[]>([]);

  useEffect(() => { persist(state); }, [state]);

  const setActiveClub = useCallback((club: Club) => {
    setState(prev => {
      const next = ensureClub(prev, club);
      return { ...next, currentClubId: club.id };
    });
  }, []);

  const trackMatch = useCallback((match: MatchResult, playerClubId: number, season: number) => {
    setState(prev => {
      const { state: next, brokenRecords } = recordMatch(prev, match, playerClubId, season);
      if (brokenRecords.length > 0) setBrokenRecordToast(q => [...q, ...brokenRecords]);
      return next;
    });
  }, []);

  const syncSquadLegends = useCallback((squad: Player[], clubId: number, season: number) => {
    setState(prev => syncLegendsFromSquad(prev, squad, clubId, season));
  }, []);

  const awardClubTrophy = useCallback((clubId: number, info: { name: string; competition: string; type: TrophyType; icon: string; rarity: Trophy["rarity"] }, season: number) => {
    setState(prev => awardTrophy(prev, clubId, info, season));
  }, []);

  const finalizeSeasonRecords = useCallback((clubId: number, squad: Player[], season: number) => {
    setState(prev => {
      const { state: next, broken } = recordSeasonEnd(prev, clubId, squad, season);
      if (broken.length > 0) setBrokenRecordToast(q => [...q, ...broken]);
      return next;
    });
  }, []);

  const dismissBrokenToast = useCallback(() => setBrokenRecordToast(q => q.slice(1)), []);
  const resetHoF = useCallback(() => { setState(EMPTY_HOF); setBrokenRecordToast([]); }, []);

  const currentClubHoF = state.currentClubId != null ? state.byClub[state.currentClubId] ?? null : null;

  return (
    <HoFContext.Provider value={{
      state,
      currentClubHoF,
      brokenRecordToast,
      setActiveClub,
      trackMatch,
      syncSquadLegends,
      awardClubTrophy,
      finalizeSeasonRecords,
      dismissBrokenToast,
      resetHoF,
    }}>
      {children}
    </HoFContext.Provider>
  );
}
