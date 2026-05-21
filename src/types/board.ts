// Board of Directors + Press Conference types

export type ObjectiveType =
  | "league_top"        // finish within top N
  | "avoid_relegation"  // finish above position N
  | "win_count"         // win X matches in season
  | "goals_scored"      // team scores X goals
  | "win_classic"       // win at least one derby
  | "cup_advance";      // advance to round N of cup

export type ObjectivePriority = "primary" | "secondary" | "stretch";
export type ObjectiveStatus = "pending" | "achieved" | "failed";

export interface BoardObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  icon: string;
  target: number;
  progress: number;
  priority: ObjectivePriority;
  status: ObjectiveStatus;
  reward: number;        // money bonus
  xpReward: number;
  season: number;
}

export interface BoardConfidence {
  value: number;     // 0-100
  label: "trust" | "neutral" | "concerned" | "critical" | "sacking";
  trend: "up" | "down" | "stable";
  history: { date: string; delta: number; reason: string }[];
}

export interface PressChoice {
  id: string;
  text: string;
  effects: {
    confidence?: number;   // -10..+10
    morale?: number;       // -10..+10 (team happiness)
    fans?: number;         // -10..+10
    media?: "favorable" | "hostile" | "neutral";
  };
  responseHeadline?: string;
}

export interface PressQuestion {
  id: string;
  context: "win" | "loss" | "draw" | "derby_win" | "derby_loss" | "thrashing_win" | "thrashing_loss";
  question: string;
  reporter: string;
  choices: PressChoice[];
}

export interface PressEvent {
  question: PressQuestion;
  matchOpponent: string;
  matchResult: string;
  date: string;
}

export const EMPTY_CONFIDENCE: BoardConfidence = {
  value: 55,
  label: "neutral",
  trend: "stable",
  history: [],
};
