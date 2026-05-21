import type { Player } from "../types/game";
import type { Club } from "../types/game";

export interface FinancialRecord {
  month: number;
  season: number;
  type: "income" | "expense";
  category: "wages" | "transfer_in" | "transfer_out" | "prize" | "ticket" | "sponsor" | "facility" | "staff" | "loan";
  description: string;
  amount: number;
}

export interface FinancialSummary {
  totalWages: number;
  weeklyWages: number;
  budgetRemaining: number;
  wageBudget: number;
  wageUsagePercent: number;
  squadSize: number;
  highestPaid: { name: string; wage: number } | null;
  lowestPaid: { name: string; wage: number } | null;
  averageWage: number;
}

export function calculateFinancialSummary(
  squad: Player[],
  club: Club,
  budget: number,
): FinancialSummary {
  const totalWages = squad.reduce((sum, p) => sum + p.wage, 0);
  const weeklyWages = Math.round(totalWages / 4);

  const sorted = [...squad].sort((a, b) => b.wage - a.wage);
  const highestPaid = sorted.length > 0 ? { name: sorted[0].name, wage: sorted[0].wage } : null;
  const lowestPaid = sorted.length > 0 ? { name: sorted[sorted.length - 1].name, wage: sorted[sorted.length - 1].wage } : null;
  const averageWage = squad.length > 0 ? Math.round(totalWages / squad.length) : 0;

  return {
    totalWages,
    weeklyWages,
    budgetRemaining: budget,
    wageBudget: club.wageBudget,
    wageUsagePercent: club.wageBudget > 0 ? Math.round((totalWages / club.wageBudget) * 100) : 0,
    squadSize: squad.length,
    highestPaid,
    lowestPaid,
    averageWage,
  };
}

export function calculateMatchDayRevenue(club: Club, isHome: boolean): number {
  if (!isHome) return 0;
  const baseTicket = club.reputation * 1500;
  const attendance = Math.floor(club.infrastructure * 500 + Math.random() * 8000);
  return Math.floor(baseTicket + attendance * 25);
}

export function calculateMonthlyExpenses(club: Club): number {
  const staffCosts = club.reputation * 8000;
  const stadiumMaint = club.infrastructure * 12000;
  return Math.floor(staffCosts + stadiumMaint);
}

export function calculatePrizeForPosition(position: number, leagueLevel: string = "Série A"): number {
  const multiplier = leagueLevel === "Série A" ? 1 : 0.4;
  const prizes: Record<number, number> = {
    1: 15000000,
    2: 10000000,
    3: 7500000,
    4: 5000000,
    5: 3000000,
    6: 2000000,
    7: 1500000,
    8: 1000000,
    9: 500000,
    10: 250000,
  };
  return (prizes[position] || 0) * multiplier;
}

export function generateSponsor(club: Club): import("../types/game").Sponsor {
  const sponsors = [
    "FlyEmirates", "Qatar Airways", "Spotify", "Rakuten", "Chevrolet",
    "TeamViewer", "Standard Chartered", "Pirelli", "T-Mobile", "Beko",
    "Betano", "Pixbet", "Crefisa", "Banrisul", "BRB"
  ];
  const name = sponsors[Math.floor(Math.random() * sponsors.length)];
  
  // Base monthly value depending on league and reputation
  const baseValue = club.league === "Série A" ? 500000 : 100000;
  const repMultiplier = club.reputation / 50; // if rep 80, multiplier is 1.6
  
  const monthlyValue = Math.floor(baseValue * repMultiplier + (Math.random() * 200000));
  const titleBonus = monthlyValue * 10;
  
  return { name, monthlyValue, titleBonus };
}

export function calculateSponsorRevenue(club: Club): number {
  if (club.sponsor) {
    return club.sponsor.monthlyValue;
  }
  return Math.floor(club.reputation * 15000 + club.infrastructure * 5000);
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`;
  }
  return `R$ ${value.toLocaleString("pt-BR")}`;
}
