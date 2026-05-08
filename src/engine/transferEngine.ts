import type { Player, Club, PositionCategory } from "../types/game";
import { generateSquadForClub } from "./playerGenerator";

export interface TransferListing {
  player: Player;
  askingPrice: number;
  sellerClubId: number | null;
  sellerClubName: string;
  daysOnMarket: number;
  negotiable: boolean;
}

export interface TransferOffer {
  id: number;
  player: Player;
  fromClubId: number;
  fromClubName: string;
  offerAmount: number;
  status: "pending" | "accepted" | "rejected";
  reason: string;
  timestamp: number;
}

// ── Squad Analysis ──────────────────────────────────────────────

interface SquadNeed {
  category: PositionCategory;
  urgency: number; // 0-1, higher = more desperate
  reason: string;
}

const IDEAL_COMPOSITION: Record<PositionCategory, { min: number; ideal: number }> = {
  GK: { min: 1, ideal: 2 },
  DEF: { min: 3, ideal: 5 },
  MID: { min: 4, ideal: 6 },
  FWD: { min: 2, ideal: 4 },
};

function analyzeSquadNeeds(squad: Player[]): SquadNeed[] {
  const counts: Record<PositionCategory, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const avgCA: Record<PositionCategory, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

  for (const p of squad) {
    counts[p.positionCategory]++;
    avgCA[p.positionCategory] += p.currentAbility;
  }
  for (const cat of Object.keys(avgCA) as PositionCategory[]) {
    avgCA[cat] = counts[cat] > 0 ? avgCA[cat] / counts[cat] : 0;
  }

  const teamAvgCA = squad.length > 0
    ? squad.reduce((s, p) => s + p.currentAbility, 0) / squad.length
    : 50;

  const needs: SquadNeed[] = [];

  for (const cat of Object.keys(IDEAL_COMPOSITION) as PositionCategory[]) {
    const { min, ideal } = IDEAL_COMPOSITION[cat];
    const count = counts[cat];
    const catAvg = avgCA[cat];

    // Critical: below minimum
    if (count < min) {
      needs.push({
        category: cat,
        urgency: 1.0,
        reason: `Apenas ${count} jogador(es) — mínimo é ${min}`,
      });
      continue;
    }

    // Low depth
    if (count < ideal) {
      const depthUrgency = 0.3 + (1 - count / ideal) * 0.4;
      needs.push({
        category: cat,
        urgency: depthUrgency,
        reason: `${count}/${ideal} jogadores — falta profundidade`,
      });
    }

    // Quality gap: sector avg is significantly below team avg
    if (catAvg > 0 && catAvg < teamAvgCA - 8) {
      const qualityGap = (teamAvgCA - catAvg) / teamAvgCA;
      needs.push({
        category: cat,
        urgency: Math.min(0.9, 0.4 + qualityGap),
        reason: `Média ${Math.round(catAvg)} CA vs ${Math.round(teamAvgCA)} do time`,
      });
    }
  }

  return needs.sort((a, b) => b.urgency - a.urgency);
}

function identifySellCandidates(squad: Player[]): Player[] {
  if (squad.length <= 18) return [];

  const candidates: { player: Player; sellScore: number }[] = [];

  const counts: Record<PositionCategory, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of squad) counts[p.positionCategory]++;

  for (const player of squad) {
    let sellScore = 0;
    const cat = player.positionCategory;

    // Excess in position
    if (counts[cat] > IDEAL_COMPOSITION[cat].ideal) {
      sellScore += 0.3;
    }

    // Old with low growth
    if (player.age >= 32) {
      sellScore += 0.2 + (player.age - 32) * 0.05;
    }

    // Low CA relative to squad
    const squadAvg = squad.reduce((s, p) => s + p.currentAbility, 0) / squad.length;
    if (player.currentAbility < squadAvg - 10) {
      sellScore += 0.3;
    }

    // High wage, low output
    const wageRatio = player.wage / Math.max(1, player.currentAbility);
    if (wageRatio > 1500) sellScore += 0.2;

    if (sellScore > 0.2) {
      candidates.push({ player, sellScore });
    }
  }

  return candidates
    .sort((a, b) => b.sellScore - a.sellScore)
    .slice(0, 3)
    .map(c => c.player);
}

// ── Market Value ────────────────────────────────────────────────

export function calculateMarketValue(player: Player): number {
  const { currentAbility: ca, potentialAbility: pa, age } = player;

  let value = ca * ca * 800;

  const growthRoom = pa - ca;
  if (growthRoom > 0 && age < 28) {
    value += growthRoom * growthRoom * 500;
  }

  if (age <= 21) value *= 1.4;
  else if (age <= 25) value *= 1.2;
  else if (age <= 28) value *= 1.0;
  else if (age <= 31) value *= 0.7;
  else if (age <= 33) value *= 0.4;
  else value *= 0.2;

  const posMult =
    player.positionCategory === "FWD" ? 1.3 :
    player.positionCategory === "MID" ? 1.1 :
    player.positionCategory === "GK" ? 0.7 : 1.0;
  value *= posMult;

  return Math.round(value / 100_000) * 100_000;
}

// ── Transfer Market Generation ──────────────────────────────────

export function generateTransferMarket(
  allClubs: Club[],
  allSquads: Map<number, Player[]>,
  playerClubId: number,
): TransferListing[] {
  const listings: TransferListing[] = [];

  for (const club of allClubs) {
    if (club.id === playerClubId) continue;

    const squad = allSquads.get(club.id);
    if (!squad || squad.length === 0) continue;

    // AI clubs sell based on analysis, not just worst players
    const sellCandidates = identifySellCandidates(squad);

    if (sellCandidates.length === 0) {
      // Fallback: sell 1 low-CA player
      const sorted = [...squad].sort((a, b) => a.currentAbility - b.currentAbility);
      if (sorted.length > 0 && Math.random() > 0.5) {
        sellCandidates.push(sorted[0]);
      }
    }

    for (const player of sellCandidates) {
      const fairValue = calculateMarketValue(player);
      const markup = 0.9 + Math.random() * 0.4;

      listings.push({
        player,
        askingPrice: Math.round((fairValue * markup) / 100_000) * 100_000,
        sellerClubId: club.id,
        sellerClubName: club.shortName || club.name,
        daysOnMarket: Math.floor(Math.random() * 30),
        negotiable: Math.random() > 0.3,
      });
    }
  }

  // Free agents
  const freeAgentCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < freeAgentCount; i++) {
    const dummyClub: Club = {
      id: 9999, name: "Free Agent", shortName: "FA",
      country: "Brasil", league: "N/A",
      reputation: 30 + Math.floor(Math.random() * 30),
      budget: 0, wageBudget: 0, formation: "4-4-2",
      mentality: "balanced", infrastructure: 40,
      colors: { primary: "#666", secondary: "#999" },
    };

    const squad = generateSquadForClub(dummyClub);
    const player = squad[Math.floor(Math.random() * squad.length)];

    listings.push({
      player: { ...player, id: 5000 + i + Date.now() % 1000 },
      askingPrice: 0,
      sellerClubId: null,
      sellerClubName: "Livre",
      daysOnMarket: Math.floor(Math.random() * 60),
      negotiable: false,
    });
  }

  return listings.sort((a, b) => b.player.currentAbility - a.player.currentAbility);
}

// ── Offer Evaluation ────────────────────────────────────────────

export function evaluateOffer(
  listing: TransferListing,
  offerAmount: number,
): "accepted" | "rejected" {
  if (listing.sellerClubId === null) return "accepted";

  const ratio = offerAmount / listing.askingPrice;

  if (ratio >= 1.0) return "accepted";
  if (ratio >= 0.85 && listing.negotiable) return "accepted";
  if (ratio >= 0.9 && listing.daysOnMarket > 20) return "accepted";

  return "rejected";
}

// ── AI Incoming Offers (Smart) ──────────────────────────────────

export function generateIncomingOffers(
  playerSquad: Player[],
  allClubs: Club[],
  playerClubId: number,
  allSquads?: Map<number, Player[]>,
): TransferOffer[] {
  const offers: TransferOffer[] = [];
  if (playerSquad.length === 0) return offers;

  const aiClubs = allClubs.filter(c => c.id !== playerClubId);

  // Each AI club may try to buy based on their needs
  const interestedClubs = aiClubs
    .filter(() => Math.random() < 0.15) // ~15% of clubs make an offer each window
    .slice(0, 3);

  for (const club of interestedClubs) {
    const aiSquad = allSquads?.get(club.id) || [];
    const needs = analyzeSquadNeeds(aiSquad);

    if (needs.length === 0) continue;

    // Find a player from human squad that fills the AI's top need
    const topNeed = needs[0];
    const targets = playerSquad
      .filter(p => p.positionCategory === topNeed.category)
      .sort((a, b) => b.currentAbility - a.currentAbility);

    if (targets.length === 0) continue;

    // AI targets the best player in that position
    const target = targets[0];
    const fairValue = calculateMarketValue(target);

    // Offer quality depends on urgency + club reputation
    const urgencyBonus = topNeed.urgency * 0.3;
    const repBonus = club.reputation > 70 ? 0.15 : club.reputation > 50 ? 0.05 : 0;
    const offerMult = 0.75 + urgencyBonus + repBonus + Math.random() * 0.2;

    const offerAmount = Math.round((fairValue * offerMult) / 100_000) * 100_000;

    // Don't make embarrassingly low offers
    if (offerAmount < fairValue * 0.5) continue;

    offers.push({
      id: Date.now() + offers.length,
      player: target,
      fromClubId: club.id,
      fromClubName: club.shortName || club.name,
      offerAmount: Math.max(offerAmount, 500_000),
      status: "pending",
      reason: topNeed.reason,
      timestamp: Date.now(),
    });
  }

  return offers;
}
