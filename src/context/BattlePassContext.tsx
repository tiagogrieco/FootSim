/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { MatchResult } from "../engine/matchEngine";
import type { BattlePassState, BPReward } from "../types/battlepass";
import { EMPTY_BP_STATE, BP_XP } from "../types/battlepass";
import { BATTLE_PASS_TIERS } from "../data/battlepassTiers";
import { tierFromXP, xpFromMatch } from "../engine/battlepassEngine";

const STORAGE_KEY = "footsim_battlepass_v1";

function load(): BattlePassState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_BP_STATE;
    const p = JSON.parse(raw) as Partial<BattlePassState>;
    return { ...EMPTY_BP_STATE, ...p };
  } catch { return EMPTY_BP_STATE; }
}
function persist(s: BattlePassState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* */ }
}

interface BPContextType {
  state: BattlePassState;
  currentTier: number;
  rewardToast: BPReward[];
  trackMatch: (match: MatchResult, playerClubId: number) => { xp: number; details: string[] };
  addXP: (amount: number, reason?: string) => void;
  claimTier: (tier: number) => BPReward | null;
  claimAllAvailable: () => BPReward[];
  resetForSeason: (season: number) => void;
  spendCoins: (amount: number) => boolean;
  dismissRewardToast: () => void;
}

const BPContext = createContext<BPContextType | null>(null);
export function useBattlePass() {
  const c = useContext(BPContext);
  if (!c) throw new Error("useBattlePass must be inside BattlePassProvider");
  return c;
}

export function BattlePassProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BattlePassState>(() => load());
  const [rewardToast, setRewardToast] = useState<BPReward[]>([]);

  useEffect(() => { persist(state); }, [state]);

  const trackMatch = useCallback((match: MatchResult, playerClubId: number) => {
    let result = { xp: 0, details: [] as string[] };
    setState(prev => {
      const hasBoost = prev.xpBoostMatches > 0;
      const xpRes = xpFromMatch(match, playerClubId, hasBoost);
      result = xpRes;
      return {
        ...prev,
        currentXP: prev.currentXP + xpRes.xp,
        xpBoostMatches: Math.max(0, prev.xpBoostMatches - 1),
      };
    });
    return result;
  }, []);

  const addXP = useCallback((amount: number) => {
    setState(prev => ({ ...prev, currentXP: prev.currentXP + amount }));
  }, []);

  const claimTier = useCallback((tier: number): BPReward | null => {
    const tierDef = BATTLE_PASS_TIERS.find(t => t.tier === tier);
    if (!tierDef) return null;
    if (state.currentXP < tierDef.xpRequired) return null;
    if (state.claimedTiers.includes(tier)) return null;

    const r = tierDef.reward;
    setState(prev => {
      const next = { ...prev, claimedTiers: [...prev.claimedTiers, tier] };
      if (r.type === "coins") next.coins += r.amount;
      else if (r.type === "xp_boost") next.xpBoostMatches += r.amount;
      else if (r.type === "badge") next.badges = [...prev.badges, r.label];
      return next;
    });
    setRewardToast(q => [...q, r]);
    return r;
  }, [state]);

  const claimAllAvailable = useCallback((): BPReward[] => {
    const currentTier = tierFromXP(state.currentXP);
    const unclaimed = BATTLE_PASS_TIERS
      .filter(t => t.tier <= currentTier && !state.claimedTiers.includes(t.tier))
      .map(t => t.tier);
    const rewards: BPReward[] = [];
    for (const t of unclaimed) {
      const r = claimTier(t);
      if (r) rewards.push(r);
    }
    return rewards;
  }, [state, claimTier]);

  const resetForSeason = useCallback((season: number) => {
    setState(prev => {
      if (prev.season === season) return prev;
      // keep coins/badges/boosts; reset XP and claimed
      return {
        ...prev,
        season,
        currentXP: 0,
        claimedTiers: [],
      };
    });
  }, []);

  const spendCoins = useCallback((amount: number): boolean => {
    if (state.coins < amount) return false;
    setState(prev => ({ ...prev, coins: prev.coins - amount }));
    return true;
  }, [state]);

  const dismissRewardToast = useCallback(() => {
    setRewardToast(q => q.slice(1));
  }, []);

  return (
    <BPContext.Provider value={{
      state,
      currentTier: tierFromXP(state.currentXP),
      rewardToast,
      trackMatch,
      addXP,
      claimTier,
      claimAllAvailable,
      resetForSeason,
      spendCoins,
      dismissRewardToast,
    }}>
      {children}
    </BPContext.Provider>
  );
}

export const BP_XP_VALUES = BP_XP;
