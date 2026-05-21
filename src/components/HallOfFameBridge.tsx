// Wires GameContext events to Hall of Fame
import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { useHallOfFame } from "../context/HallOfFameContext";

export default function HallOfFameBridge() {
  const { playerClub, season, lastMatchResult, seasonEndResult, playerSquad, standings } = useGame();
  const { setActiveClub, trackMatch, syncSquadLegends, awardClubTrophy, finalizeSeasonRecords } = useHallOfFame();
  const lastMatch = useRef<typeof lastMatchResult>(null);
  const lastSeason = useRef<typeof seasonEndResult>(null);

  // Ensure club entry exists
  useEffect(() => {
    if (playerClub) setActiveClub(playerClub);
  }, [playerClub, setActiveClub]);

  // Record each new match
  useEffect(() => {
    if (!lastMatchResult) return;
    if (lastMatch.current === lastMatchResult) return;
    lastMatch.current = lastMatchResult;
    trackMatch(lastMatchResult, playerClub.id, season);
  }, [lastMatchResult, playerClub.id, season, trackMatch]);

  // Periodically sync legend stats (cheap)
  useEffect(() => {
    if (!playerSquad?.length) return;
    syncSquadLegends(playerSquad, playerClub.id, season);
  }, [playerSquad, playerClub.id, season, syncSquadLegends]);

  // Season end: award trophies + finalize records
  useEffect(() => {
    if (!seasonEndResult) return;
    if (lastSeason.current === seasonEndResult) return;
    lastSeason.current = seasonEndResult;
    const r = seasonEndResult as unknown as {
      wonLeague?: boolean;
      wonCup?: boolean;
      leagueName?: string;
      cupName?: string;
    };
    if (r.wonLeague) {
      awardClubTrophy(playerClub.id, {
        name: r.leagueName ?? "Campeonato Brasileiro",
        competition: "league", type: "league",
        icon: "🏆", rarity: "platinum",
      }, season);
    }
    if (r.wonCup) {
      awardClubTrophy(playerClub.id, {
        name: r.cupName ?? "Copa do Brasil",
        competition: "cup", type: "cup",
        icon: "🏅", rarity: "gold",
      }, season);
    }
    // Finalize season records based on squad stats
    if (playerSquad?.length) {
      finalizeSeasonRecords(playerClub.id, playerSquad, season);
    }
    // Position-based standing record (top 3)
    const idx = standings.findIndex(s => s.clubId === playerClub.id);
    const finalPos = idx >= 0 ? idx + 1 : null;
    if (finalPos === 2) {
      awardClubTrophy(playerClub.id, {
        name: "Vice-Campeonato", competition: "league-vice",
        type: "special", icon: "🥈", rarity: "silver",
      }, season);
    } else if (finalPos === 3) {
      awardClubTrophy(playerClub.id, {
        name: "3º Lugar", competition: "league-third",
        type: "special", icon: "🥉", rarity: "bronze",
      }, season);
    }
  }, [seasonEndResult, playerClub.id, season, playerSquad, standings, awardClubTrophy, finalizeSeasonRecords]);

  return null;
}
