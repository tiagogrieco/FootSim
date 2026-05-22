// Mounted inside both GameProvider and MetaProvider.
// Watches game state and pushes events into the Meta layer.

import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { useMeta } from "../context/MetaContext";
import { generateJobOffers } from "../engine/careerEngine";
import type { MatchResult } from "../engine/matchEngine";

const PROCESSED_MATCHES_KEY = "footsim_processed_matches";

function getProcessedMatches(): Set<string> {
  try {
    const stored = sessionStorage.getItem(PROCESSED_MATCHES_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function saveProcessedMatches(set: Set<string>) {
  sessionStorage.setItem(PROCESSED_MATCHES_KEY, JSON.stringify([...set]));
}

function getMatchKey(match: MatchResult): string {
  return match.matchId || `${match.homeClub.id}-${match.awayClub.id}-${match.homeGoals}-${match.awayGoals}`;
}

export default function MetaBridge() {
  const { lastMatchResult, playerClub, currentDate, standings, seasonEndResult, allClubs, setJobOffers, gameStarted } = useGame();
  const { trackMatch, trackBestPosition, syncChallengesForDate, trackTrophy, profile } = useMeta();

  const processedMatchesRef = useRef<Set<string>>(getProcessedMatches());
  const lastSeasonRef = useRef<typeof seasonEndResult>(null);

  // Clear processed matches when starting a new game (no lastMatchResult and game just started)
  useEffect(() => {
    if (!lastMatchResult && gameStarted && profile.totalMatchesManaged === 0) {
      processedMatchesRef.current.clear();
      sessionStorage.removeItem(PROCESSED_MATCHES_KEY);
    }
  }, [lastMatchResult, gameStarted, profile.totalMatchesManaged]);

  // Roll daily challenges when in-game date changes
  useEffect(() => {
    if (currentDate) syncChallengesForDate(currentDate);
  }, [currentDate, syncChallengesForDate]);

  // Track each NEW match result (persisted across component remounts)
  useEffect(() => {
    if (!lastMatchResult) return;
    const key = getMatchKey(lastMatchResult);
    if (processedMatchesRef.current.has(key)) return;
    processedMatchesRef.current.add(key);
    saveProcessedMatches(processedMatchesRef.current);
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
