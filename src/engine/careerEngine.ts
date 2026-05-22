import type { Club } from "../types/game";
import type { JobOffer } from "../types/career";

export function generateJobOffers(
  managerRep: number,
  allClubs: Club[],
  currentClubId: number,
  seasonEndPosition: number,
  isRelegated: boolean
): JobOffer[] {
  const offers: JobOffer[] = [];
  
  // Clubs that can offer: reputation < managerRep + 15
  const eligibleClubs = allClubs.filter(c => 
    c.id !== currentClubId && 
    (c.reputation ?? 5000) < (managerRep * 100 + 1500) // managerRep is 0-100, club rep is ~1000-10000
  );
  
  // Sort by reputation descending
  eligibleClubs.sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0));
  
  // Top clubs interested based on performance
  const numOffers = isRelegated 
    ? 1 // Only smaller clubs want a relegated manager
    : seasonEndPosition <= 4 
    ? 3 // Top performance attracts more offers
    : seasonEndPosition <= 10 
    ? 2 
    : 1;
  
  const selectedClubs = eligibleClubs.slice(0, numOffers);
  
  for (const club of selectedClubs) {
    const budgetBonus = Math.round((managerRep / 100) * 0.2 * (club.budget || 500000));
    
    const description = seasonEndPosition <= 4
      ? `Seu desempenho na temporada chamou atenção. O ${club.name} quer você para levar o clube ao próximo nível.`
      : isRelegated
      ? `O ${club.name} acredita que você pode reconstruir a carreira em um novo projeto.`
      : `O ${club.name} está de olho no seu trabalho. Interessado em um novo desafio?`;
    
    offers.push({
      club,
      offeredBudget: (club.budget || 500000) + budgetBonus,
      offeredWageBudget: (club.wageBudget || 40000) + Math.round(budgetBonus * 0.05),
      description,
    });
  }
  
  return offers;
}
