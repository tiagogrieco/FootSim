// Battle Pass — 50-tier seasonal progression

export type BPRewardType =
  | "coins"
  | "cash"
  | "pack_basic"
  | "pack_premium"
  | "pack_legendary"
  | "xp_boost"
  | "badge";

export interface BPReward {
  type: BPRewardType;
  amount: number;          // coins/cash quantity OR boost duration (matches)
  label: string;
  icon: string;
}

export interface BPTier {
  tier: number;           // 1..50
  xpRequired: number;     // cumulative from tier 1
  reward: BPReward;
  premium?: boolean;      // (future-paid track)
}

export interface BattlePassState {
  season: number;
  currentXP: number;
  claimedTiers: number[];
  coins: number;
  xpBoostMatches: number;   // remaining matches with 2× XP
  badges: string[];
}

export const EMPTY_BP_STATE: BattlePassState = {
  season: 0,
  currentXP: 0,
  claimedTiers: [],
  coins: 0,
  xpBoostMatches: 0,
  badges: [],
};

// XP rewards from in-game events
export const BP_XP = {
  match_win: 100,
  match_draw: 30,
  match_loss: 10,
  clean_sheet: 25,
  motm: 20,
  daily_challenge: 50,
  derby_win: 80,        // bonus on top of match_win
  trophy: 1000,
} as const;

export const XP_PER_TIER = 100;
export const MAX_TIER = 50;
