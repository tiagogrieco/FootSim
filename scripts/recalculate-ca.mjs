import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const weights = {
  GK:  { pace: 0.05, shooting: 0.02, passing: 0.08, dribbling: 0.03, defending: 0.12, physical: 0.10, goalkeeping: 0.60 },
  DEF: { pace: 0.12, shooting: 0.05, passing: 0.12, dribbling: 0.08, defending: 0.30, physical: 0.20, goalkeeping: 0.00 },
  MID: { pace: 0.10, shooting: 0.12, passing: 0.25, dribbling: 0.20, defending: 0.12, physical: 0.12, goalkeeping: 0.00 },
  FWD: { pace: 0.18, shooting: 0.30, passing: 0.10, dribbling: 0.20, defending: 0.02, physical: 0.12, goalkeeping: 0.00 },
};

function calculateCA(attrs, posCategory) {
  const w = weights[posCategory];
  let ca = 0;
  for (const key of Object.keys(w)) {
    ca += (attrs[key] ?? 0) * w[key];
  }
  return Math.round(ca);
}

function processPlayers(players) {
  return players.map(p => ({
    ...p,
    currentAbility: calculateCA(p.attributes, p.positionCategory),
  }));
}

// Process players.json
const playersPath = join(root, 'src', 'data', 'players.json');
const players = JSON.parse(readFileSync(playersPath, 'utf8'));
const updatedPlayers = processPlayers(players);
writeFileSync(playersPath, JSON.stringify(updatedPlayers, null, 2) + '\n', 'utf8');
console.log(`✅ Recalculated CA for ${updatedPlayers.length} players in players.json`);

// Process all_squads.json
const squadsPath = join(root, 'src', 'data', 'all_squads.json');
const squads = JSON.parse(readFileSync(squadsPath, 'utf8'));
let totalSquadPlayers = 0;
for (const clubId of Object.keys(squads)) {
  squads[clubId] = processPlayers(squads[clubId]);
  totalSquadPlayers += squads[clubId].length;
}
writeFileSync(squadsPath, JSON.stringify(squads, null, 2) + '\n', 'utf8');
console.log(`✅ Recalculated CA for ${totalSquadPlayers} players in all_squads.json`);
