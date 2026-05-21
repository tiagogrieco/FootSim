// Wires GameContext events to Battle Pass progression.
import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { useBattlePass } from "../context/BattlePassContext";

export default function BattlePassBridge() {
  const { lastMatchResult, playerClub, season, seasonEndResult } = useGame();
  const { trackMatch, resetForSeason, addXP } = useBattlePass();

  const lastMatch = useRef<typeof lastMatchResult>(null);
  const lastSeasonEnd = useRef<typeof seasonEndResult>(null);

  useEffect(() => {
    if (season) resetForSeason(season);
  }, [season, resetForSeason]);

  useEffect(() => {
    if (!lastMatchResult) return;
    if (lastMatch.current === lastMatchResult) return;
    lastMatch.current = lastMatchResult;
    trackMatch(lastMatchResult, playerClub.id);
  }, [lastMatchResult, playerClub.id, trackMatch]);

  // Trophy bonus
  useEffect(() => {
    if (!seasonEndResult) return;
    if (lastSeasonEnd.current === seasonEndResult) return;
    lastSeasonEnd.current = seasonEndResult;
    const r = seasonEndResult as unknown as { wonLeague?: boolean; wonCup?: boolean };
    if (r.wonLeague) addXP(1000);
    if (r.wonCup) addXP(1000);
  }, [seasonEndResult, addXP]);

  return null;
}
