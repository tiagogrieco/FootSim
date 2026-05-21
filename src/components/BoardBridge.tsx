// Wires GameContext events into BoardContext.
import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { useBoard } from "../context/BoardContext";

export default function BoardBridge() {
  const { playerClub, season, lastMatchResult, standings } = useGame();
  const { ensureSeasonObjectives, trackMatch, updateStandingPosition } = useBoard();
  const lastMatch = useRef<typeof lastMatchResult>(null);

  // Generate objectives on season change
  useEffect(() => {
    if (playerClub && season) ensureSeasonObjectives(playerClub, season);
  }, [playerClub, season, ensureSeasonObjectives]);

  // Track each new match
  useEffect(() => {
    if (!lastMatchResult) return;
    if (lastMatch.current === lastMatchResult) return;
    lastMatch.current = lastMatchResult;
    trackMatch(lastMatchResult, playerClub.id, playerClub.difficulty);
  }, [lastMatchResult, playerClub.id, playerClub.difficulty, trackMatch]);

  // Track league position for objectives
  useEffect(() => {
    const idx = standings.findIndex(s => s.clubId === playerClub.id);
    if (idx >= 0) updateStandingPosition(idx + 1);
  }, [standings, playerClub.id, updateStandingPosition]);

  return null;
}
