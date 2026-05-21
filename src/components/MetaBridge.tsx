// Mounted inside both GameProvider and MetaProvider.
// Watches game state and pushes events into the Meta layer.

import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { useMeta } from "../context/MetaContext";

export default function MetaBridge() {
  const { lastMatchResult, playerClub, currentDate, standings, seasonEndResult } = useGame();
  const { trackMatch, trackBestPosition, syncChallengesForDate, trackTrophy } = useMeta();

  const lastMatchRef = useRef<typeof lastMatchResult>(null);
  const lastSeasonRef = useRef<typeof seasonEndResult>(null);

  // Roll daily challenges when in-game date changes
  useEffect(() => {
    if (currentDate) syncChallengesForDate(currentDate);
  }, [currentDate, syncChallengesForDate]);

  // Track each NEW match result
  useEffect(() => {
    if (!lastMatchResult) return;
    if (lastMatchRef.current === lastMatchResult) return;
    lastMatchRef.current = lastMatchResult;
    trackMatch(lastMatchResult, playerClub.id);
  }, [lastMatchResult, playerClub.id, trackMatch]);

  // Track best league position
  useEffect(() => {
    const idx = standings.findIndex(s => s.clubId === playerClub.id);
    if (idx >= 0) trackBestPosition(idx + 1);
  }, [standings, playerClub.id, trackBestPosition]);

  // Track trophies on season end
  useEffect(() => {
    if (!seasonEndResult) return;
    if (lastSeasonRef.current === seasonEndResult) return;
    lastSeasonRef.current = seasonEndResult;
    const r = seasonEndResult as unknown as { wonLeague?: boolean; wonCup?: boolean };
    if (r.wonLeague) trackTrophy();
    if (r.wonCup) trackTrophy();
  }, [seasonEndResult, trackTrophy]);

  return null;
}
