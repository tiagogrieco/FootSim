import type { Player, Club } from "../types/game";

export interface NPCTransfer {
  player: Player;
  fromClubId: number;
  toClubId: number;
  fee: number;
}

export function simulateNPCTransfers(
  allSquads: Map<number, Player[]>,
  allClubs: Club[],
  playerClubId: number,
): NPCTransfer[] {
  const transfers: NPCTransfer[] = [];
  const npcClubs = allClubs.filter(c => c.id !== playerClubId);

  for (const buyer of npcClubs) {
    if (Math.random() > 0.15) continue; // 15% chance per club per cycle
    const seller = npcClubs[Math.floor(Math.random() * npcClubs.length)];
    if (seller.id === buyer.id) continue;

    const sellerSquad = allSquads.get(seller.id) || [];
    if (sellerSquad.length <= 16) continue; // keep minimum squad

    const listed = sellerSquad.filter(p => (p.happiness ?? 50) < 40 || p.age >= 30);
    if (listed.length === 0) continue;

    const target = listed[Math.floor(Math.random() * listed.length)];
    const fee = Math.round(target.marketValue * (0.8 + Math.random() * 0.4));
    if (buyer.budget < fee) continue;

    transfers.push({ player: target, fromClubId: seller.id, toClubId: buyer.id, fee });
  }

  return transfers;
}
