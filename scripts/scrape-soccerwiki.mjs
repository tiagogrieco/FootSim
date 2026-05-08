/**
 * SoccerWiki Scraper for FootSim
 * Fetches real player data from pt-br.soccerwiki.org
 * and generates JSON files for the game.
 *
 * Usage: node scripts/scrape-soccerwiki.mjs
 */

import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "src", "data");

const CLUBS = [
  { id: 1, name: "Atlético Mineiro", shortName: "CAM", wikiId: 286, colors: { primary: "#1a1a1a", secondary: "#ffffff" }, reputation: 75, budget: 18000000, wageBudget: 950000, infrastructure: 72 },
  { id: 2, name: "Palmeiras", shortName: "PAL", wikiId: 300, colors: { primary: "#006437", secondary: "#ffffff" }, reputation: 85, budget: 40000000, wageBudget: 1800000, infrastructure: 88 },
  { id: 3, name: "Flamengo", shortName: "FLA", wikiId: 294, colors: { primary: "#c4161c", secondary: "#1a1a1a" }, reputation: 88, budget: 45000000, wageBudget: 2000000, infrastructure: 85 },
  { id: 4, name: "São Paulo", shortName: "SPF", wikiId: 306, colors: { primary: "#ffffff", secondary: "#c4161c" }, reputation: 80, budget: 30000000, wageBudget: 1400000, infrastructure: 78 },
  { id: 5, name: "Internacional", shortName: "INT", wikiId: 298, colors: { primary: "#c4161c", secondary: "#ffffff" }, reputation: 78, budget: 25000000, wageBudget: 1200000, infrastructure: 75 },
  { id: 6, name: "Grêmio", shortName: "GRE", wikiId: 602, colors: { primary: "#0091d2", secondary: "#1a1a1a" }, reputation: 76, budget: 22000000, wageBudget: 1100000, infrastructure: 74 },
  { id: 7, name: "Cruzeiro", shortName: "CRU", wikiId: 292, colors: { primary: "#003399", secondary: "#ffffff" }, reputation: 73, budget: 20000000, wageBudget: 1000000, infrastructure: 70 },
  { id: 8, name: "Botafogo", shortName: "BOT", wikiId: 288, colors: { primary: "#1a1a1a", secondary: "#ffffff" }, reputation: 77, budget: 28000000, wageBudget: 1300000, infrastructure: 72 },
  { id: 9, name: "Corinthians", shortName: "COR", wikiId: 290, colors: { primary: "#1a1a1a", secondary: "#ffffff" }, reputation: 80, budget: 25000000, wageBudget: 1200000, infrastructure: 75 },
  { id: 10, name: "Fluminense", shortName: "FLU", wikiId: 295, colors: { primary: "#7b2d3f", secondary: "#006400" }, reputation: 76, budget: 18000000, wageBudget: 900000, infrastructure: 70 },
];

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "4-1-4-1"];
const MENTALITIES = ["defensive", "balanced", "attacking"];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Parse position from SoccerWiki format to FootSim format
function parsePosition(posStr) {
  if (!posStr) return { position: "CM", positionCategory: "MID" };
  const s = posStr.trim().toUpperCase();

  // Goalkeeper
  if (s.includes("GR") || s === "G") return { position: "GK", positionCategory: "GK" };

  // Defenders
  if (s.startsWith("D") && !s.startsWith("DM")) {
    if (s.includes("(E)") || s.includes("(DE)") || s.includes("(EC)")) return { position: "LB", positionCategory: "DEF" };
    if (s.includes("(D)") || s.includes("(DD)") || s.includes("(DC)")) return { position: "RB", positionCategory: "DEF" };
    if (s.includes("(C)") || s.includes("(DEC)") || s.includes("(EC)") || !s.includes("(")) return { position: "CB", positionCategory: "DEF" };
    return { position: "CB", positionCategory: "DEF" };
  }

  // Defensive mid
  if (s.includes("DM") || s.includes("MD")) return { position: "CDM", positionCategory: "MID" };

  // Attacking mid
  if (s.startsWith("MA") || s.includes(",MA")) {
    if (s.includes("(E)") || s.includes("(EC)")) return { position: "CAM", positionCategory: "MID" };
    if (s.includes("(D)") || s.includes("(DC)")) return { position: "CAM", positionCategory: "MID" };
    return { position: "CAM", positionCategory: "MID" };
  }

  // Central mid
  if (s.startsWith("M") && !s.startsWith("MA")) {
    if (s.includes("(E)")) return { position: "LM", positionCategory: "MID" };
    if (s.includes("(D)")) return { position: "RM", positionCategory: "MID" };
    if (s.includes(",MA")) return { position: "CAM", positionCategory: "MID" };
    return { position: "CM", positionCategory: "MID" };
  }

  // Forwards/Attackers
  if (s.startsWith("A") || s.includes(",A")) {
    if (s.includes("(E)") || s.includes("(EC)")) return { position: "LW", positionCategory: "FWD" };
    if (s.includes("(D)") || s.includes("(DC)")) return { position: "RW", positionCategory: "FWD" };
    return { position: "ST", positionCategory: "FWD" };
  }

  return { position: "CM", positionCategory: "MID" };
}

// Generate realistic attributes based on rating and position
function generateAttributes(rating, posCategory) {
  const base = Math.max(30, rating - 12);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const noise = () => rand(-6, 6);
  const clamp = (v) => Math.min(99, Math.max(10, v));

  if (posCategory === "GK") {
    return {
      pace: clamp(base - 22 + noise()),
      shooting: clamp(base - 40 + noise()),
      passing: clamp(base - 8 + noise()),
      dribbling: clamp(base - 25 + noise()),
      defending: clamp(base - 12 + noise()),
      physical: clamp(base + noise()),
      goalkeeping: clamp(rating + rand(-3, 3)),
    };
  }
  if (posCategory === "DEF") {
    return {
      pace: clamp(base - 2 + noise()),
      shooting: clamp(base - 18 + noise()),
      passing: clamp(base - 5 + noise()),
      dribbling: clamp(base - 10 + noise()),
      defending: clamp(rating + rand(-3, 5)),
      physical: clamp(base + 3 + noise()),
      goalkeeping: 0,
    };
  }
  if (posCategory === "MID") {
    return {
      pace: clamp(base - 3 + noise()),
      shooting: clamp(base + 2 + noise()),
      passing: clamp(rating + rand(-3, 5)),
      dribbling: clamp(base + 3 + noise()),
      defending: clamp(base - 8 + noise()),
      physical: clamp(base - 2 + noise()),
      goalkeeping: 0,
    };
  }
  // FWD
  return {
    pace: clamp(base + 5 + noise()),
    shooting: clamp(rating + rand(-3, 5)),
    passing: clamp(base - 3 + noise()),
    dribbling: clamp(base + 5 + noise()),
    defending: clamp(base - 22 + noise()),
    physical: clamp(base - 2 + noise()),
    goalkeeping: 0,
  };
}

const COUNTRY_MAP = {
  BRA: "Brasil", ARG: "Argentina", URY: "Uruguai", COL: "Colômbia",
  CHL: "Chile", ECU: "Equador", PAR: "Paraguai", PER: "Peru",
  VEN: "Venezuela", MEX: "México", POR: "Portugal", ESP: "Espanha",
  ITA: "Itália", FRA: "França", DEU: "Alemanha", GBR: "Inglaterra",
  NLD: "Holanda", BEL: "Bélgica", BOL: "Bolívia", CRI: "Costa Rica",
};

function getNationality(code) {
  return COUNTRY_MAP[code] || code || "Brasil";
}

async function scrapePlayerPage(pid) {
  const url = `https://pt-br.soccerwiki.org/player.php?pid=${pid}`;
  try {
    const html = await fetchPage(url);

    // Name from <title>
    const nameMatch = html.match(/<title>\s*([^-<]+)/);
    const name = nameMatch ? nameMatch[1].trim().replace(/ - Soccer Wiki.*/, "") : "Unknown";

    // Position from HTML: Posição:</span> <span ...>M,MA(EC)</span>
    const posMatch = html.match(/Posi[çc][ãa]o:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);
    const rawPos = posMatch ? posMatch[1].trim() : "";

    // Rating from HTML: <span class="promo-creative-tickets-number">90</span>
    const ratingMatch = html.match(/promo-creative-tickets-number[^>]*>(\d+)/);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 65;

    // Age from HTML: Idade:</span> 28 (Aug 27, 1997)
    const ageMatch = html.match(/Idade:<\/span>\s*(\d+)/);
    const age = ageMatch ? parseInt(ageMatch[1]) : 25;

    // Country from link
    const countryMatch = html.match(/countryId=([A-Z]{3})/);
    const country = countryMatch ? countryMatch[1] : "BRA";

    // Shirt number
    const shirtMatch = html.match(/Numera[çc][ãa]o do Plantel:<\/span>\s*(\d+)/i);
    const shirtNumber = shirtMatch ? parseInt(shirtMatch[1]) : 0;

    return { name, position: rawPos, rating, age, country, shirtNumber };
  } catch (e) {
    console.error(`  ❌ Error pid=${pid}: ${e.message}`);
    return null;
  }
}

async function scrapeClubSquad(wikiId) {
  const url = `https://pt-br.soccerwiki.org/squad.php?clubid=${wikiId}`;
  try {
    const html = await fetchPage(url);
    const pidRegex = /player\.php\?pid=(\d+)/g;
    const pids = new Set();
    let match;
    while ((match = pidRegex.exec(html)) !== null) {
      pids.add(parseInt(match[1]));
    }
    return [...pids];
  } catch (e) {
    console.error(`  ❌ Error club ${wikiId}: ${e.message}`);
    return [];
  }
}

function calcMarketValue(rating, age) {
  const base = Math.pow(rating / 100, 3) * 30000000;
  let mult = 1;
  if (age <= 22) mult = 1.3;
  else if (age <= 26) mult = 1.15;
  else if (age >= 32) mult = 0.5;
  else if (age >= 30) mult = 0.7;
  return Math.round(base * mult);
}

function calcWage(rating) {
  return Math.round(Math.pow(rating / 100, 2) * 120000 / 1000) * 1000;
}

async function main() {
  console.log("🚀 FootSim SoccerWiki Scraper v2");
  console.log("=================================\n");

  const allSquads = {};
  let globalId = 1;

  for (const club of CLUBS) {
    console.log(`\n⚽ ${club.name} (wikiId: ${club.wikiId})...`);

    const pids = await scrapeClubSquad(club.wikiId);
    console.log(`  📋 Found ${pids.length} player links`);

    const limitedPids = pids.slice(0, 25);
    const players = [];
    let shirtCounter = 1;

    for (const pid of limitedPids) {
      await sleep(350);
      const data = await scrapePlayerPage(pid);
      if (!data) continue;

      const { position: posStr, positionCategory: posCat } = parsePosition(data.position);
      const attrs = generateAttributes(data.rating, posCat);

      players.push({
        id: globalId++,
        name: data.name,
        age: data.age,
        nationality: getNationality(data.country),
        position: posStr,
        positionCategory: posCat,
        shirtNumber: data.shirtNumber || shirtCounter,
        attributes: attrs,
        currentAbility: 0,
        potentialAbility: Math.min(99, data.rating + Math.floor(Math.random() * 8)),
        morale: 65 + Math.floor(Math.random() * 25),
        fitness: 80 + Math.floor(Math.random() * 18),
        marketValue: calcMarketValue(data.rating, data.age),
        wage: calcWage(data.rating),
      });

      shirtCounter++;
      process.stdout.write(`  ✅ ${data.name} [${posStr}|${data.rating}|${data.age}y]\n`);
    }

    allSquads[club.id] = players;
    console.log(`  🏁 Total: ${players.length} players for ${club.name}`);
  }

  // Players.json = club 1 (Atlético Mineiro = player's team)
  const myPlayers = allSquads[1] || [];
  fs.writeFileSync(path.join(DATA_DIR, "players.json"), JSON.stringify(myPlayers, null, 2));
  console.log(`\n📁 players.json → ${myPlayers.length} players`);

  // All squads for AI teams
  fs.writeFileSync(path.join(DATA_DIR, "all_squads.json"), JSON.stringify(allSquads, null, 2));
  console.log(`📁 all_squads.json → ${Object.keys(allSquads).length} clubs`);

  // Clubs.json
  const clubsJson = CLUBS.map((c) => ({
    id: c.id, name: c.name, shortName: c.shortName,
    country: "Brasil", league: "Série A",
    reputation: c.reputation, budget: c.budget, wageBudget: c.wageBudget, infrastructure: c.infrastructure,
    colors: c.colors,
    formation: FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)],
    mentality: MENTALITIES[Math.floor(Math.random() * MENTALITIES.length)],
  }));
  fs.writeFileSync(path.join(DATA_DIR, "clubs.json"), JSON.stringify(clubsJson, null, 2));
  console.log(`📁 clubs.json → ${clubsJson.length} clubs`);

  console.log("\n🎉 Done! Real player data generated.");
}

main().catch(console.error);
