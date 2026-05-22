// Mounted inside both GameProvider and MetaProvider.
// Watches game state and pushes events into the Meta layer.

import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { useMeta } from "../context/MetaContext";
import { generateJobOffers } from "../engine/careerEngine";

export default function MetaBridge() {
  const { lastMatchResult, playerClub, currentDate, standings, seasonEndResult, allClubs, setJobOffers, gameStarted } = useGame();
  const { trackMatch, trackBestPosition, syncChallengesForDate, trackTrophy, profile } = useMeta();

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

  // Track best league position (only after at least 1 match played)
  useEffect(() => {
    if (!gameStarted || profile.totalMatchesManaged === 0) return;
    const idx = standings.findIndex(s => s.clubId === playerClub.id);
    if (idx >= 0) trackBestPosition(idx + 1);
  }, [standings, playerClub.id, trackBestPosition, gameStarted, profile.totalMatchesManaged]);

  // Track trophies on season end + generate job offers
  useEffect(() => {
    if (!seasonEndResult) return;
    if (lastSeasonRef.current === seasonEndResult) return;
    lastSeasonRef.current = seasonEndResult;
    const r = seasonEndResult as unknown as { wonLeague?: boolean; wonCup?: boolean };
    if (r.wonLeague) trackTrophy();
    if (r.wonCup) trackTrophy();
    
    // Generate job offers based on season performance
    const isRelegated = seasonEndResult.relegated;
    const position = seasonEndResult.finalPosition;
    const offers = generateJobOffers(profile.managerReputation, allClubs, playerClub.id, position, isRelegated);
    setJobOffers(offers);
  }, [seasonEndResult, trackTrophy, profile.managerReputation, allClubs, playerClub.id, setJobOffers]);

  return null;
}
