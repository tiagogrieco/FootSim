import type { RPGData } from "./rpg";

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
}

export type Position = "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM" | "LM" | "RM" | "LW" | "RW" | "ST" | "CF";

export type PreferredFoot = "left" | "right" | "both";

export type Personality = "determined" | "professional" | "lazy" | "temperamental" | "leader";

export type PositionCategory = "GK" | "DEF" | "MID" | "FWD";

export interface PlayerSeasonStats {
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  avgRating: number;
  totalRating: number;
  cleanSheets: number; // for GKs/defenders
  motm: number; // man of the match awards
}

export interface SeasonHistoryEntry {
  season: number;
  clubName: string;
  clubShort: string;
  stats: PlayerSeasonStats;
}

export interface ClubSeasonHistoryEntry {
  season: number;
  league: string;
  position: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  isChampion: boolean;
  promoted: boolean;
  relegated: boolean;
}

export function createEmptyStats(): PlayerSeasonStats {
  return { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, avgRating: 0, totalRating: 0, cleanSheets: 0, motm: 0 };
}

export interface Player {
  id: number;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  positionCategory: PositionCategory;
  shirtNumber: number;
  attributes: PlayerAttributes;
  currentAbility: number;
  potentialAbility: number;
  morale: number;
  fitness: number;
  marketValue: number;
  wage: number;
  seasonStats: PlayerSeasonStats;
  careerHistory?: SeasonHistoryEntry[];
  injuryDays?: number; // E3: Days remaining until the player recovers
  suspensionDays?: number; // E3: Match suspension (usually measured in games, but we'll use days/matches)
  preferredFoot: PreferredFoot;
  personality: Personality;
  form: number; // 0-100, rolling average based on recent match ratings
  happiness: number; // 0-100, satisfaction with playing time
  rpg?: RPGData;     // RPG card data (rarity, level, xp, traits)
  trainingFocus?: "Físico" | "Técnico" | "Tático" | "Geral";
  playtimePromiseMatches?: number;
  playtimePromiseStarts?: number;
  strikeDays?: number;
  contractYears?: number;
  contractExpiry?: string; // YYYY-MM-DD
}

export interface Sponsor {
  name: string;
  monthlyValue: number;
  titleBonus: number;
}

export interface Club {
  id: number;
  name: string;
  shortName: string;
  country: string;
  league: string;
  reputation: number;
  budget: number;
  wageBudget: number;
  debt?: number;
  infrastructure: number;
  colors: {
    primary: string;
    secondary: string;
  };
  formation: string;
  mentality: "defensive" | "balanced" | "attacking";
  sponsor?: Sponsor;
  startingLineup?: number[];
  history?: ClubSeasonHistoryEntry[];
  logoUrl?: string;
  youthAcademy?: Player[];
  scoutReports?: Record<number, string>; // Cache for AI scout reports
  difficulty?: "easy" | "medium" | "hard";
  fanSatisfaction?: number; // 0-100
}

export interface BoardObjective {
  type: "points_run";
  targetPoints: number;
  gamesLimit: number;
  gamesPlayed: number;
  pointsEarned: number;
  description: string;
}

export interface InboxMessage {
  id: string;
  sender: string;       // e.g. "Presidente", "Capitão", "Olheiro"
  subject: string;
  body: string;
  date: string;
  type: "board" | "player" | "scout" | "system";
  read: boolean;
  actionRequired?: boolean;
  actionCompleted?: boolean;
  actionOptions?: {
    id: string;
    text: string;
    replyText: string;
    effects: {
      budgetChange?: number;
      boardConfidenceChange?: number;
      playerMoraleChange?: { playerId: number; change: number };
      playerHappinessChange?: { playerId: number; change: number };
      activeObjective?: BoardObjective;
      playtimePromise?: { matches: number; playerId: number };
      wageIncrease?: { newWage: number; playerId: number };
      staffSatisfactionChange?: { role: string; change: number };
      staffQualityChange?: { role: string; change: number };
      strikeDays?: { days: number; playerId: number };
    };
  }[];
}


export interface GameEventOption {
  text: string;
  effectText: string;
  effects: {
    budgetChange?: number;
    moraleChange?: number; // global morale change
    boardConfidenceChange?: number; // board confidence change
    playerMoralChange?: {
      target: "random" | "star" | "reserve";
      value: number;
    };
    xpBoost?: {
      target: "all" | "random";
      value: number;
    };
    injuryPlayer?: {
      probability: number;
      maxDuration: number;
    };
  };
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  options: GameEventOption[];
}

export interface GameState {
  currentClub: Club;
  players: Player[];
  currentDate: string;
  season: number;
}

export function calculateCA(attrs: PlayerAttributes, posCategory: PositionCategory): number {
  const weights: Record<PositionCategory, Record<keyof PlayerAttributes, number>> = {
    GK:  { pace: 0.05, shooting: 0.02, passing: 0.08, dribbling: 0.03, defending: 0.12, physical: 0.10, goalkeeping: 0.60 },
    DEF: { pace: 0.12, shooting: 0.05, passing: 0.12, dribbling: 0.08, defending: 0.30, physical: 0.20, goalkeeping: 0.00 },
    MID: { pace: 0.10, shooting: 0.12, passing: 0.25, dribbling: 0.20, defending: 0.12, physical: 0.12, goalkeeping: 0.00 },
    FWD: { pace: 0.18, shooting: 0.30, passing: 0.10, dribbling: 0.20, defending: 0.02, physical: 0.12, goalkeeping: 0.00 },
  };

  const w = weights[posCategory];
  let ca = 0;
  for (const key of Object.keys(w) as (keyof PlayerAttributes)[]) {
    ca += attrs[key] * w[key];
  }
  return Math.round(ca);
}

export function getPositionCategory(pos: Position): PositionCategory {
  if (pos === "GK") return "GK";
  if (["CB", "LB", "RB"].includes(pos)) return "DEF";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "MID";
  return "FWD";
}

export function getAttrColor(value: number): string {
  if (value >= 80) return "#10b981";
  if (value >= 65) return "#22c55e";
  if (value >= 50) return "#f59e0b";
  if (value >= 35) return "#f97316";
  return "#ef4444";
}
