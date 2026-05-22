import type { Club } from "./game";

export interface JobOffer {
  club: Club;
  offeredBudget: number;
  offeredWageBudget: number;
  description: string;
}
