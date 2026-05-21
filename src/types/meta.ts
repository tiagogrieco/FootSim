// Meta-game types: Manager XP, Achievements, Daily Challenges, Newsfeed

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  xp: number;
  hidden?: boolean;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export type ChallengeType =
  | "win_match"
  | "win_home"
  | "win_away"
  | "clean_sheet"
  | "score_2plus"
  | "score_3plus"
  | "win_big"
  | "motm"
  | "score_first"
  | "comeback";

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  description: string;
  icon: string;
  xpReward: number;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
}

export interface NewsItem {
  id: string;
  date: string;
  headline: string;
  body?: string;
  tone: "good" | "bad" | "neutral" | "big";
  icon: string;
  read: boolean;
}

export interface ManagerProfile {
  name: string;
  xp: number;
  level: number;
  totalMatchesManaged: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGoalsScored: number;
  totalGoalsConceded: number;
  totalCleanSheets: number;
  cleanSheetStreak: number;
  winStreak: number;
  unbeatenRun: number;
  matchHatTricks: number;
  biggestWinMargin: number;
  trophiesWon: number;
  highestPosition: number;
  careerStarted: string;
  challengesCompleted: number;
}

export const EMPTY_PROFILE: ManagerProfile = {
  name: "Manager",
  xp: 0,
  level: 1,
  totalMatchesManaged: 0,
  totalWins: 0,
  totalDraws: 0,
  totalLosses: 0,
  totalGoalsScored: 0,
  totalGoalsConceded: 0,
  totalCleanSheets: 0,
  cleanSheetStreak: 0,
  winStreak: 0,
  unbeatenRun: 0,
  matchHatTricks: 0,
  biggestWinMargin: 0,
  trophiesWon: 0,
  highestPosition: 99,
  careerStarted: new Date().toISOString(),
  challengesCompleted: 0,
};
