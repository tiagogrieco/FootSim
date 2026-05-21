import { useState, useCallback } from "react";
import type { Player, Club } from "../types/game";
import { createEmptyStats } from "../types/game";
import {
  generateTransferMarket,
  generateIncomingOffers,
  generateOffersForListedPlayers,
  evaluateOffer,
  generateCounterOffer,
  type TransferListing,
  type TransferOffer,
} from "../engine/transferEngine";
import type { SaveData } from "../engine/saveEngine";
import { simulateNPCTransfers } from "../engine/npcTransferEngine";
import { formatCurrency } from "../engine/financeEngine";

export function useTransferManager() {
  const [incomingOffers, setIncomingOffers] = useState<TransferOffer[]>([]);
  const [transferMarket, setTransferMarket] = useState<TransferListing[]>([]);
  const [listedForSale, setListedForSale] = useState<number[]>([]);

  const startNewGame = useCallback((
    freshClubs: Club[],
    squads: Map<number, Player[]>,
    playerClubId: number,
    playerSquad: Player[]
  ) => {
    const market = generateTransferMarket(freshClubs, squads, playerClubId);
    setTransferMarket(market);

    const offers = generateIncomingOffers(playerSquad, freshClubs, playerClubId, squads);
    setIncomingOffers(offers);
    setListedForSale([]);

    return { market, offers };
  }, []);

  const advanceDay = useCallback((
    _dateStr: string,
    currentSquads: Map<number, Player[]>,
    allClubs: Club[],
    playerClubId: number,
    currentListedForSale: number[],
    isWindowOpen: boolean
  ) => {
    const newTransferOffers: TransferOffer[] = [];
    let stopReason: "offer" | null = null;
    let stopDetail = "";

    if (isWindowOpen) {
      if (currentListedForSale.length > 0 && Math.random() < 0.06) {
        const listedPlayers = (currentSquads.get(playerClubId) || []).filter(p => currentListedForSale.includes(p.id));
        if (listedPlayers.length > 0) {
          const offers = generateOffersForListedPlayers(listedPlayers, allClubs, playerClubId, currentSquads);
          if (offers.length > 0) {
            newTransferOffers.push(...offers);
            stopReason = "offer";
            stopDetail = `📨 Oferta por ${offers[0].player.name}: ${formatCurrency(offers[0].offerAmount)}`;
          }
        }
      }

      if (!stopReason && Math.random() < 0.03) {
        const offers = generateIncomingOffers(currentSquads.get(playerClubId) || [], allClubs, playerClubId, currentSquads);
        if (offers.length > 0) {
          newTransferOffers.push(offers[0]);
          stopReason = "offer";
          stopDetail = `📨 Oferta por ${offers[0].player.name}: ${formatCurrency(offers[0].offerAmount)}`;
        }
      }

      if (!stopReason && Math.random() < 0.01) {
        const squad = currentSquads.get(playerClubId) || [];
        const stars = squad.filter(p => p.currentAbility >= 75 && (p.form ?? 50) > 60);
        if (stars.length > 0) {
          const target = stars[Math.floor(Math.random() * stars.length)];
          const bigClubs = allClubs.filter(c => c.id !== playerClubId && c.reputation > 6000);
          if (bigClubs.length > 0) {
            const buyer = bigClubs[Math.floor(Math.random() * bigClubs.length)];
            const irresistibleOffer: TransferOffer = {
              id: Date.now(),
              player: target,
              fromClubId: buyer.id,
              fromClubName: buyer.shortName,
              offerAmount: Math.round(target.marketValue * (2.5 + Math.random())),
              status: "pending",
              reason: `💎 Oferta irrecusável de ${buyer.shortName}!`,
              timestamp: Date.now(),
            };
            newTransferOffers.push(irresistibleOffer);
            stopReason = "offer";
            stopDetail = `💎 ${buyer.shortName} fez oferta irrecusável por ${target.name}: ${formatCurrency(irresistibleOffer.offerAmount)}!`;
          }
        }
      }
    }

    // NPC Transfers (background)
    const npcTransfers = simulateNPCTransfers(currentSquads, allClubs, playerClubId);
    const newSquads = new Map(currentSquads);
    for (const t of npcTransfers) {
      const fromSquad = newSquads.get(t.fromClubId) || [];
      const toSquad = newSquads.get(t.toClubId) || [];
      newSquads.set(t.fromClubId, fromSquad.filter(p => p.id !== t.player.id));
      newSquads.set(t.toClubId, [...toSquad, { ...t.player, happiness: 60 }]);
    }

    // Auto-refresh transfer market (~every 6-7 days)
    let newMarket = transferMarket;
    if (Math.random() < 0.10) {
      newMarket = generateTransferMarket(allClubs, newSquads, playerClubId);
    }

    return {
      newOffers: newTransferOffers,
      stopReason,
      stopDetail,
      newSquads,
      npcTransfers,
      newMarket,
    };
  }, [transferMarket]);

  const listForSale = useCallback((playerId: number) => {
    setListedForSale(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
  }, []);

  const unlistForSale = useCallback((playerId: number) => {
    setListedForSale(prev => prev.filter(id => id !== playerId));
  }, []);

  const makeOffer = useCallback((
    listingIndex: number,
    offerAmount: number,
    currentMarket: TransferListing[],
    currentBudget: number
  ): {
    result: "accepted" | "rejected" | "counter";
    newPlayer?: Player;
    newBudget?: number;
    newMarket?: TransferListing[];
    listing?: TransferListing;
  } => {
    const listing = currentMarket[listingIndex];
    if (!listing) return { result: "rejected" };
    if (offerAmount > currentBudget) return { result: "rejected" };

    const evalResult = evaluateOffer(listing, offerAmount);

    if (evalResult === "accepted") {
      const newPlayer = { ...listing.player, seasonStats: listing.player.seasonStats || createEmptyStats() };
      const newMarket = currentMarket.filter((_, i) => i !== listingIndex);
      return {
        result: "accepted",
        newPlayer,
        newBudget: currentBudget - offerAmount,
        newMarket,
        listing,
      };
    } else if (evalResult === "counter") {
      const counterPrice = generateCounterOffer(listing, offerAmount);
      const newMarket = currentMarket.map((l, i) =>
        i === listingIndex ? { ...l, askingPrice: counterPrice } : l
      );
      return { result: "counter", newMarket };
    }

    return { result: "rejected" };
  }, []);

  const respondToOffer = useCallback((
    offerId: number,
    accept: boolean,
    currentOffers: TransferOffer[],
    currentPlayerSquad: Player[]
  ) => {
    const offer = currentOffers.find(o => o.id === offerId);
    if (!offer) return { success: false };

    if (!accept) {
      const nextOffers = currentOffers.map(o => o.id === offerId ? { ...o, status: "rejected" as const } : o);
      setIncomingOffers(nextOffers);
      return { success: true, nextOffers };
    }

    const stillExists = currentPlayerSquad.find(p => p.id === offer.player.id);
    if (!stillExists) {
      const nextOffers = currentOffers.map(o => o.id === offerId ? { ...o, status: "rejected" as const } : o);
      setIncomingOffers(nextOffers);
      return { success: true, nextOffers, stale: true };
    }

    const nextOffers = currentOffers.map(o => {
      if (o.id === offerId) return { ...o, status: "accepted" as const };
      if (o.player.id === offer.player.id && o.status === "pending") return { ...o, status: "rejected" as const };
      return o;
    });

    setIncomingOffers(nextOffers);
    setListedForSale(prev => prev.filter(id => id !== offer.player.id));

    return {
      success: true,
      nextOffers,
      offer,
      currentPlayer: stillExists,
    };
  }, []);

  const refreshTransferMarket = useCallback((
    allClubs: Club[],
    allSquads: Map<number, Player[]>,
    playerClubId: number,
    playerSquad: Player[],
    currentListedForSale: number[]
  ) => {
    const market = generateTransferMarket(allClubs, allSquads, playerClubId);
    setTransferMarket(market);

    const offers = generateIncomingOffers(playerSquad, allClubs, playerClubId, allSquads);
    const listedPlayers = playerSquad.filter(p => currentListedForSale.includes(p.id));
    const listedOffers = generateOffersForListedPlayers(listedPlayers, allClubs, playerClubId, allSquads);

    const nextOffers = [...offers, ...listedOffers];
    setIncomingOffers(prev => [...prev.filter(o => o.status === "pending"), ...nextOffers]);

    return { market, offers: nextOffers };
  }, []);

  const applyLoadedState = useCallback((data: SaveData) => {
    setTransferMarket(data.transferMarket || []);
    setIncomingOffers(data.incomingOffers || []);
    setListedForSale(data.listedForSale || []);
  }, []);

  return {
    incomingOffers,
    setIncomingOffers,
    transferMarket,
    setTransferMarket,
    listedForSale,
    setListedForSale,
    startNewGame,
    advanceDay,
    listForSale,
    unlistForSale,
    makeOffer,
    respondToOffer,
    refreshTransferMarket,
    applyLoadedState,
  };
}
