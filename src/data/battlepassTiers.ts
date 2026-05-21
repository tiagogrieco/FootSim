import type { BPTier, BPReward } from "../types/battlepass";
import { XP_PER_TIER, MAX_TIER } from "../types/battlepass";

// Reward pattern: every 5th tier = pack, every 10th = legendary item, others = coins/cash/boost
function rewardForTier(tier: number): BPReward {
  if (tier === MAX_TIER) {
    return { type: "pack_legendary", amount: 1, label: "Pack LENDÁRIO", icon: "👑" };
  }
  if (tier === 1) return { type: "coins", amount: 50, label: "50 Moedas", icon: "🪙" };
  if (tier % 10 === 0) {
    return { type: "pack_legendary", amount: 1, label: "Pack Lendário", icon: "🌟" };
  }
  if (tier % 5 === 0) {
    return { type: "pack_premium", amount: 1, label: "Pack Premium", icon: "💎" };
  }
  if (tier === 25) {
    return { type: "badge", amount: 1, label: "Badge: Hexa Master", icon: "🎖️" };
  }
  // Even/odd mix
  if (tier % 3 === 0) return { type: "xp_boost", amount: 3, label: "XP Boost × 3 jogos", icon: "⚡" };
  if (tier % 2 === 0) return { type: "cash", amount: 500_000, label: "R$ 500K Caixa", icon: "💰" };
  return { type: "coins", amount: 25 + tier, label: `${25 + tier} Moedas`, icon: "🪙" };
}

export const BATTLE_PASS_TIERS: BPTier[] = Array.from({ length: MAX_TIER }, (_, i) => {
  const tier = i + 1;
  return {
    tier,
    xpRequired: tier * XP_PER_TIER,
    reward: rewardForTier(tier),
  };
});
