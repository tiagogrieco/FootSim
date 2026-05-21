/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { MatchResult } from "../engine/matchEngine";
import type { Club } from "../types/game";
import type { BoardObjective, BoardConfidence, PressEvent, PressChoice } from "../types/board";
import { EMPTY_CONFIDENCE } from "../types/board";
import {
  generateBoardObjectives,
  updateObjectivesFromMatch,
  updateObjectivesFromStanding,
  adjustConfidence,
  confidenceDeltaFromMatch,
} from "../engine/boardEngine";
import { pickPressQuestion } from "../data/pressQuestions";
import { findRivalry } from "../data/rivalries";

const STORAGE_KEY = "footsim_board_v1";

interface BoardState {
  objectives: BoardObjective[];
  confidence: BoardConfidence;
  currentSeason: number | null;
  clubId: number | null;
  pressHistory: { date: string; question: string; chosen: string; headline: string }[];
}

const EMPTY_STATE: BoardState = {
  objectives: [],
  confidence: EMPTY_CONFIDENCE,
  currentSeason: null,
  clubId: null,
  pressHistory: [],
};

function load(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const p = JSON.parse(raw) as Partial<BoardState>;
    return {
      objectives: p.objectives ?? [],
      confidence: p.confidence ?? EMPTY_CONFIDENCE,
      currentSeason: p.currentSeason ?? null,
      clubId: p.clubId ?? null,
      pressHistory: p.pressHistory ?? [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function persist(s: BoardState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* */ }
}

interface BoardContextType {
  objectives: BoardObjective[];
  confidence: BoardConfidence;
  pendingPress: PressEvent | null;
  pressHistory: BoardState["pressHistory"];

  ensureSeasonObjectives: (club: Club, season: number) => void;
  trackMatch: (match: MatchResult, playerClubId: number, difficulty?: "easy" | "medium" | "hard") => void;
  updateStandingPosition: (position: number) => void;
  chooseResponse: (choice: PressChoice) => void;
  dismissPress: () => void;
  setPressHold: (hold: boolean) => void;
  releasePress: () => void;
  resetBoard: () => void;
  adjustBoardConfidence: (delta: number, reason: string) => void;
}

const BoardContext = createContext<BoardContextType | null>(null);

export function useBoard() {
  const c = useContext(BoardContext);
  if (!c) throw new Error("useBoard must be inside BoardProvider");
  return c;
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BoardState>(() => load());
  const [pendingPress, setPendingPress] = useState<PressEvent | null>(null);
  const holdRef = useRef(false);
  const queuedPressRef = useRef<PressEvent | null>(null);

  useEffect(() => { persist(state); }, [state]);

  const ensureSeasonObjectives = useCallback((club: Club, season: number) => {
    setState(prev => {
      if (prev.currentSeason === season && prev.clubId === club.id) return prev;
      return {
        ...prev,
        currentSeason: season,
        clubId: club.id,
        objectives: generateBoardObjectives(club, season),
        confidence: prev.clubId === club.id ? prev.confidence : EMPTY_CONFIDENCE,
      };
    });
  }, []);

  const trackMatch = useCallback((match: MatchResult, playerClubId: number, difficulty?: "easy" | "medium" | "hard") => {
    setState(prev => {
      const { objectives } = updateObjectivesFromMatch(prev.objectives, match, playerClubId);
      let { delta, reason } = confidenceDeltaFromMatch(match, playerClubId);
      
      if (difficulty === "hard") {
        if (delta < 0) {
          delta = Math.round(delta * 1.35);
          reason += " (Dificuldade)";
        } else if (delta > 0) {
          delta = Math.round(delta * 0.85);
        }
      } else if (difficulty === "medium") {
        if (delta < 0) {
          delta = Math.round(delta * 1.15);
        }
      }
      
      const date = new Date().toISOString().split("T")[0];
      const confidence = adjustConfidence(prev.confidence, delta, reason, date);
      return { ...prev, objectives, confidence };
    });

    // Trigger press conference
    const isHome = match.homeClub.id === playerClubId;
    const my = isHome ? match.homeGoals : match.awayGoals;
    const op = isHome ? match.awayGoals : match.homeGoals;
    const diff = my - op;
    const opponentId = isHome ? match.awayClub.id : match.homeClub.id;
    const isDerby = !!findRivalry(playerClubId, opponentId);
    const opponentName = isHome ? match.awayClub.shortName : match.homeClub.shortName;

    let ctx: PressEvent["question"]["context"] | null = null;
    if (isDerby) {
      ctx = diff > 0 ? "derby_win" : diff < 0 ? "derby_loss" : null;
    } else if (diff >= 4) ctx = "thrashing_win";
    else if (diff <= -4) ctx = "thrashing_loss";
    else if (diff > 0 && Math.random() < 0.35) ctx = "win";
    else if (diff < 0 && Math.random() < 0.4) ctx = "loss";

    if (ctx) {
      const q = pickPressQuestion(ctx);
      if (q) {
        const evt: PressEvent = {
          question: q,
          matchOpponent: opponentName,
          matchResult: `${my}×${op}`,
          date: new Date().toISOString().split("T")[0],
        };
        if (holdRef.current) {
          queuedPressRef.current = evt;
        } else {
          setPendingPress(evt);
        }
      }
    }
  }, []);

  const setPressHold = useCallback((hold: boolean) => {
    holdRef.current = hold;
  }, []);

  const releasePress = useCallback(() => {
    holdRef.current = false;
    if (queuedPressRef.current) {
      setPendingPress(queuedPressRef.current);
      queuedPressRef.current = null;
    }
  }, []);

  const updateStandingPosition = useCallback((position: number) => {
    setState(prev => ({
      ...prev,
      objectives: updateObjectivesFromStanding(prev.objectives, position),
    }));
  }, []);

  const chooseResponse = useCallback((choice: PressChoice) => {
    if (!pendingPress) return;
    const date = new Date().toISOString().split("T")[0];
    setState(prev => {
      const d = choice.effects.confidence ?? 0;
      const reason = `Coletiva: "${choice.text.slice(0, 30)}..."`;
      return {
        ...prev,
        confidence: adjustConfidence(prev.confidence, d, reason, date),
        pressHistory: [
          ...prev.pressHistory.slice(-30),
          {
            date,
            question: pendingPress.question.question,
            chosen: choice.text,
            headline: choice.responseHeadline ?? "Treinador responde à imprensa",
          },
        ],
      };
    });
    setPendingPress(null);
  }, [pendingPress]);

  const dismissPress = useCallback(() => setPendingPress(null), []);

  const resetBoard = useCallback(() => { setState(EMPTY_STATE); setPendingPress(null); }, []);

  const adjustBoardConfidence = useCallback((delta: number, reason: string) => {
    const date = new Date().toISOString().split("T")[0];
    setState(prev => ({
      ...prev,
      confidence: adjustConfidence(prev.confidence, delta, reason, date)
    }));
  }, []);

  return (
    <BoardContext.Provider value={{
      objectives: state.objectives,
      confidence: state.confidence,
      pendingPress,
      pressHistory: state.pressHistory,
      ensureSeasonObjectives,
      trackMatch,
      updateStandingPosition,
      chooseResponse,
      dismissPress,
      setPressHold,
      releasePress,
      resetBoard,
      adjustBoardConfidence,
    }}>
      {children}
    </BoardContext.Provider>
  );
}
