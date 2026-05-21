import { useState, useCallback } from "react";
import type { BoardObjective as GameBoardObjective, InboxMessage } from "../types/game";
import type { MatchResult } from "../engine/matchEngine";
import type { Club } from "../types/game";
import type { SaveData } from "../engine/saveEngine";
import type { SeasonEndResult } from "../engine/seasonEngine";

export function useSeasonManager(
  adjustBoardConfidence: (delta: number, reason: string) => void
) {
  const [season, setSeason] = useState(2026);
  const [currentDate, setCurrentDate] = useState("2026-03-01");
  const [activeBoardObjective, setActiveBoardObjective] = useState<GameBoardObjective | null>(null);
  const [seasonEndResult, setSeasonEndResult] = useState<SeasonEndResult | null>(null);

  const startNewGame = useCallback(() => {
    setSeason(2026);
    setCurrentDate("2026-03-01");
    setActiveBoardObjective(null);
    setSeasonEndResult(null);
  }, []);

  const advanceDay = useCallback((currentDateStr: string) => {
    const localDate = new Date(currentDateStr);
    localDate.setDate(localDate.getDate() + 1);
    return localDate.toISOString().split("T")[0];
  }, []);

  const startNewSeason = useCallback((newSeason: number) => {
    setSeason(newSeason);
    setCurrentDate(`${newSeason}-03-01`);
    setActiveBoardObjective(null);
    setSeasonEndResult(null);
    return { season: newSeason, date: `${newSeason}-03-01` };
  }, []);

  const checkBoardObjective = useCallback((
    objective: GameBoardObjective | null,
    playerMatch: MatchResult,
    playerClub: Club
  ): {
    newObjective: GameBoardObjective | null;
    messages: { sender: string; subject: string; body: string; type: InboxMessage["type"] }[];
  } => {
    const messages: { sender: string; subject: string; body: string; type: InboxMessage["type"] }[] = [];
    if (!objective) return { newObjective: null, messages };

    let pts = 0;
    const isHomeClub = playerMatch.homeClub.id === playerClub.id;
    const homeScore = playerMatch.homeGoals;
    const awayScore = playerMatch.awayGoals;

    if (homeScore === awayScore) {
      pts = 1;
    } else if (isHomeClub && homeScore > awayScore) {
      pts = 3;
    } else if (!isHomeClub && awayScore > homeScore) {
      pts = 3;
    }

    const nextObj = {
      ...objective,
      gamesPlayed: objective.gamesPlayed + 1,
      pointsEarned: objective.pointsEarned + pts,
    };

    if (nextObj.gamesPlayed >= nextObj.gamesLimit) {
      const success = nextObj.pointsEarned >= nextObj.targetPoints;

      if (success) {
        adjustBoardConfidence(15, `Meta da Diretoria: Cumprida`);
        messages.push({
          sender: "Presidente",
          subject: "Meta de Pontos Concluída com Sucesso",
          body: `Prezado treinador,\n\nParabéns pelo empenho. Você conquistou ${nextObj.pointsEarned} pontos nas últimas ${nextObj.gamesLimit} partidas, superando nossa meta de ${nextObj.targetPoints} pontos.\n\nSua permanência no cargo está assegurada por enquanto e a confiança da diretoria subiu.\n\nAtenciosamente,\nDiretoria do ${playerClub.name}`,
          type: "board",
        });
      } else {
        adjustBoardConfidence(-20, `Meta da Diretoria: Fracasso`);
        messages.push({
          sender: "Presidente",
          subject: "Fracasso no cumprimento da meta",
          body: `Prezado treinador,\n\nEstamos profundamente decepcionados. A meta de conquistar ${nextObj.targetPoints} pontos em ${nextObj.gamesLimit} jogos não foi cumprida (conquistou apenas ${nextObj.pointsEarned} pontos).\n\nA paciência da diretoria está no limite e novos tropeços não serão tolerados.\n\nAtenciosamente,\nDiretoria do ${playerClub.name}`,
          type: "board",
        });
      }
      return { newObjective: null, messages };
    } else {
      return { newObjective: nextObj, messages };
    }
  }, [adjustBoardConfidence]);

  const applyLoadedState = useCallback((data: SaveData) => {
    setSeason(data.season);
    setCurrentDate(data.currentDate);
    setActiveBoardObjective(data.activeBoardObjective || null);
    setSeasonEndResult(data.seasonEndResult || null);
  }, []);

  return {
    season,
    setSeason,
    currentDate,
    setCurrentDate,
    activeBoardObjective,
    setActiveBoardObjective,
    seasonEndResult,
    setSeasonEndResult,
    startNewGame,
    advanceDay,
    startNewSeason,
    checkBoardObjective,
    applyLoadedState,
  };
}
