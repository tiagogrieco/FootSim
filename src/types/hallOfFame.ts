// Hall of Fame — troféus do clube, recordes históricos, lendas

export type TrophyType = "league" | "cup" | "international" | "supercup" | "special";

export interface Trophy {
  id: string;
  name: string;
  type: TrophyType;
  competition: string;
  season: number;
  date: string;
  icon: string;
  rarity: "bronze" | "silver" | "gold" | "platinum";
}

export type RecordType =
  | "biggest_win"
  | "biggest_loss"
  | "longest_unbeaten"
  | "longest_win_streak"
  | "most_goals_match"
  | "most_goals_season"
  | "most_clean_sheets_season"
  | "top_scorer_career"
  | "most_apps_career"
  | "most_motm_career";

export interface ClubRecord {
  type: RecordType;
  label: string;
  value: number;
  detail: string;         // ex: "vs Palmeiras 5-0"
  holderName?: string;    // jogador que detém (se aplicável)
  season: number;
  date: string;
  icon: string;
}

export interface LegendStats {
  playerId: number;
  name: string;
  apps: number;
  goals: number;
  assists: number;
  motm: number;
  cleanSheets: number;
  firstSeason: number;
  lastSeason: number;
  position: string;
  positionCategory: string;
  isLegend: boolean;        // true se atinge critério
  legendaryFeats: string[]; // ex: "Hat-trick em clássico", "Vice-artilheiro 2027"
}

export interface ClubHoF {
  clubId: number;
  clubName: string;
  trophies: Trophy[];
  records: Partial<Record<RecordType, ClubRecord>>;
  legends: Record<number, LegendStats>;  // playerId → stats
  totalMatches: number;
  totalWins: number;
}

export interface HoFState {
  byClub: Record<number, ClubHoF>;
  currentClubId: number | null;
}

export const EMPTY_HOF: HoFState = { byClub: {}, currentClubId: null };

// Thresholds for legend status
export const LEGEND_THRESHOLDS = {
  apps: 50,
  goals: 30,
  motm: 8,
  trophiesContributed: 1,
};
