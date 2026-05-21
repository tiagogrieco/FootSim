import type { MatchResult } from "./matchEngine";
import { BP_XP, XP_PER_TIER, MAX_TIER } from "../types/battlepass";
import { findRivalry } from "../data/rivalries";

export function tierFromXP(xp: number): number {
  return Math.min(MAX_TIER, Math.floor(xp / XP_PER_TIER));
}

export function xpToNextTier(xp: number): { current: number; needed: number; percent: number; tier: number } {
  const tier = tierFromXP(xp);
  if (tier >= MAX_TIER) return { current: XP_PER_TIER, needed: XP_PER_TIER, percent: 100, tier: MAX_TIER };
  const base = tier * XP_PER_TIER;
  const cur = xp - base;
  return { current: cur, needed: XP_PER_TIER, percent: (cur / XP_PER_TIER) * 100, tier };
}

export function xpFromMatch(match: MatchResult, playerClubId: number, hasBoost: boolean): { xp: number; details: string[] } {
  const isHome = match.homeClub.id === playerClubId;
  const my = isHome ? match.homeGoals : match.awayGoals;
  const op = isHome ? match.awayGoals : match.homeGoals;
  const mySide = isHome ? "home" : "away";
  const opponentId = isHome ? match.awayClub.id : match.homeClub.id;
  const isDerby = !!findRivalry(playerClubId, opponentId);

  let xp = 0;
  const details: string[] = [];

  if (my > op) { xp += BP_XP.match_win; details.push(`Vitória +${BP_XP.match_win}`); }
  else if (my === op) { xp += BP_XP.match_draw; details.push(`Empate +${BP_XP.match_draw}`); }
  else { xp += BP_XP.match_loss; details.push(`Derrota +${BP_XP.match_loss}`); }

  if (op === 0) { xp += BP_XP.clean_sheet; details.push(`Clean sheet +${BP_XP.clean_sheet}`); }
  if (match.motm && match.motm.team === mySide) { xp += BP_XP.motm; details.push(`MOTM +${BP_XP.motm}`); }
  if (my > op && isDerby) { xp += BP_XP.derby_win; details.push(`Vitória em clássico +${BP_XP.derby_win}`); }

  if (hasBoost) { xp *= 2; details.push("⚡ XP Boost ×2"); }
  return { xp: Math.round(xp), details };
}
