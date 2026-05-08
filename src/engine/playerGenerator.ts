import type { Player, Club, Position, PositionCategory, PlayerAttributes } from "../types/game";
import { calculateCA, getPositionCategory, createEmptyStats } from "../types/game";

const FIRST_NAMES = [
  "Lucas", "Gabriel", "Pedro", "Rafael", "Matheus", "Bruno", "Felipe", "Gustavo",
  "André", "Diego", "Thiago", "Vinícius", "Caio", "Eduardo", "Leandro", "Rodrigo",
  "Marcos", "Carlos", "João", "Daniel", "Igor", "Leonardo", "Henrique", "Fábio",
  "Alex", "Ricardo", "Murilo", "Renan", "Samuel", "Yuri", "Wesley", "Nathan",
  "Arthur", "Enzo", "Davi", "Bryan", "Kevin", "William", "Patrick", "Michel",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Ferreira", "Costa",
  "Almeida", "Ribeiro", "Martins", "Araújo", "Nascimento", "Rocha", "Campos",
  "Mendes", "Barbosa", "Moreira", "Carvalho", "Gomes", "Nunes", "Correia",
  "Teixeira", "Vieira", "Monteiro", "Cardoso", "Pinto", "Borges", "Ramos", "Freitas",
];

const SQUAD_TEMPLATE: { position: Position; count: number }[] = [
  { position: "GK", count: 2 },
  { position: "CB", count: 3 },
  { position: "LB", count: 2 },
  { position: "RB", count: 2 },
  { position: "CDM", count: 2 },
  { position: "CM", count: 2 },
  { position: "CAM", count: 1 },
  { position: "LW", count: 1 },
  { position: "RW", count: 1 },
  { position: "ST", count: 2 },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAttributes(posCategory: PositionCategory, quality: number): PlayerAttributes {
  const base = Math.max(20, quality - 15);
  const top = Math.min(99, quality + 15);

  const attrs: PlayerAttributes = {
    pace: rand(base, top),
    shooting: rand(base, top),
    passing: rand(base, top),
    dribbling: rand(base, top),
    defending: rand(base, top),
    physical: rand(base, top),
    goalkeeping: posCategory === "GK" ? rand(base + 10, Math.min(99, top + 10)) : rand(0, 15),
  };

  if (posCategory === "GK") {
    attrs.shooting = rand(5, 25);
    attrs.dribbling = rand(10, 35);
  } else if (posCategory === "DEF") {
    attrs.defending = Math.min(99, attrs.defending + rand(5, 15));
    attrs.physical = Math.min(99, attrs.physical + rand(3, 10));
  } else if (posCategory === "MID") {
    attrs.passing = Math.min(99, attrs.passing + rand(5, 15));
    attrs.dribbling = Math.min(99, attrs.dribbling + rand(3, 10));
  } else {
    attrs.shooting = Math.min(99, attrs.shooting + rand(8, 18));
    attrs.pace = Math.min(99, attrs.pace + rand(3, 12));
  }

  return attrs;
}

let globalPlayerId = 100;

export function generateSquadForClub(club: Club): Player[] {
  const players: Player[] = [];
  const qualityBase = club.reputation * 0.8;

  for (const slot of SQUAD_TEMPLATE) {
    for (let i = 0; i < slot.count; i++) {
      const posCategory = getPositionCategory(slot.position);
      const quality = rand(Math.max(30, qualityBase - 12), Math.min(90, qualityBase + 8));
      const age = rand(18, 34);
      const attrs = generateAttributes(posCategory, quality);

      const player: Player = {
        id: globalPlayerId++,
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        age,
        nationality: "Brasil",
        position: slot.position,
        positionCategory: posCategory,
        shirtNumber: players.length + 1,
        attributes: attrs,
        currentAbility: calculateCA(attrs, posCategory),
        potentialAbility: Math.min(99, quality + rand(0, 15)),
        morale: rand(55, 90),
        fitness: rand(75, 99),
        marketValue: quality * rand(30000, 80000),
        wage: quality * rand(300, 800),
        seasonStats: createEmptyStats(),
      };

      players.push(player);
    }
  }

  return players;
}

export function generateYouthPlayers(club: Club, count: number): Player[] {
  const players: Player[] = [];
  
  // Infrastructure (1-100) dictates the base quality of the youth academy
  // Better infrastructure means higher potential and current ability
  const baseQuality = (club.infrastructure || 50) * 0.8; 
  
  for (let i = 0; i < count; i++) {
    // Pick a random position
    const slot = pick(SQUAD_TEMPLATE);
    const posCategory = getPositionCategory(slot.position);
    
    // Regens are between 16 and 17 years old
    const age = rand(16, 17);
    
    // Quality for youths is lower than main squad, but potential is key
    // They start raw but can have high potential
    const quality = rand(Math.max(20, baseQuality - 20), Math.min(80, baseQuality + 5));
    const attrs = generateAttributes(posCategory, quality);
    const currentAbility = calculateCA(attrs, posCategory);
    
    // Potential can be highly variable, with chance for "wonderkids"
    const wonderkidChance = rand(1, 100);
    let potentialBonus = rand(10, 25);
    if (wonderkidChance > 90) potentialBonus += 15; // 10% chance of high potential boost
    
    const potentialAbility = Math.min(99, Math.max(currentAbility + 10, quality + potentialBonus));
    
    const player: Player = {
      id: globalPlayerId++,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      age,
      nationality: "Brasil",
      position: slot.position,
      positionCategory: posCategory,
      shirtNumber: rand(40, 99), // Youth players usually get higher shirt numbers
      attributes: attrs,
      currentAbility,
      potentialAbility,
      morale: rand(70, 95), // Usually happy to be promoted
      fitness: rand(85, 99),
      marketValue: currentAbility * rand(10000, 30000), // Cheaper because they are young
      wage: currentAbility * rand(50, 150), // Youth contract
      seasonStats: createEmptyStats(),
    };

    players.push(player);
  }

  return players;
}
