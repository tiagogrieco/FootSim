// Brazilian club rivalries (derbies)
export interface Rivalry {
  a: number;
  b: number;
  name: string;
  intensity: 1 | 2 | 3; // 3 = mais quente
}

export const RIVALRIES: Rivalry[] = [
  // São Paulo
  { a: 2, b: 9, name: "Derby Paulista", intensity: 3 },        // Palmeiras x Corinthians
  { a: 4, b: 9, name: "Majestoso", intensity: 3 },             // SP x Corinthians
  { a: 2, b: 4, name: "Choque-Rei", intensity: 3 },            // Palmeiras x SP
  { a: 2, b: 12, name: "Clássico da Saudade", intensity: 2 },  // Palmeiras x Santos
  { a: 4, b: 12, name: "San-São", intensity: 2 },              // SP x Santos
  { a: 9, b: 12, name: "Clássico Alvinegro", intensity: 2 },   // Corinthians x Santos
  // Rio
  { a: 3, b: 10, name: "Fla-Flu", intensity: 3 },              // Flamengo x Fluminense
  { a: 3, b: 11, name: "Clássico dos Milhões", intensity: 3 }, // Flamengo x Vasco
  { a: 3, b: 8, name: "Clássico da Rivalidade", intensity: 3 },// Flamengo x Botafogo
  { a: 8, b: 10, name: "Clássico Vovô", intensity: 2 },        // Botafogo x Fluminense
  { a: 8, b: 11, name: "Clássico da Amizade", intensity: 2 },  // Botafogo x Vasco
  { a: 10, b: 11, name: "Clássico dos Gigantes", intensity: 2 }, // Fluminense x Vasco
  // Sul
  { a: 5, b: 6, name: "GRENAL", intensity: 3 },                // Internacional x Grêmio
  // Minas
  { a: 1, b: 7, name: "Clássico Mineiro", intensity: 3 },      // Atlético-MG x Cruzeiro
  { a: 1, b: 17, name: "Clássico das Multidões", intensity: 2 },// CAM x América-MG
  { a: 7, b: 17, name: "Clássico do Século", intensity: 2 },   // Cruzeiro x América-MG
];

export function findRivalry(clubA: number, clubB: number): Rivalry | undefined {
  return RIVALRIES.find(r =>
    (r.a === clubA && r.b === clubB) || (r.a === clubB && r.b === clubA)
  );
}
