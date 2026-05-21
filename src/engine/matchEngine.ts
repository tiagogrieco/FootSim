import type { Player, Club } from "../types/game";
import {
  calcZoneStrengths, calcPossession, attackProgression,
  createMomentum, updateMomentum, tickMomentum,
  getAIMentality, getMentalityModifier, calcHomeAdvantage,
  type ZoneStrengths,
} from "./matchZones";

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "injury"
    | "chance" | "save" | "miss" | "foul" | "corner" | "kickoff" | "halftime" | "fulltime" | "penalty" | "counter_attack";
  team: "home" | "away" | "neutral";
  playerName: string;
  assistName?: string;
  description: string;
  commentary: string;
  importance: "low" | "medium" | "high";
  injuryDays?: number;
  suspensionDays?: number;
}

export interface MatchResult {
  homeClub: Club;
  awayClub: Club;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  homeRating: number;
  awayRating: number;
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  fouls: { home: number; away: number };
  corners: { home: number; away: number };
  motm?: { name: string; team: "home" | "away"; rating: number };
  fitnessImpact: Map<number, number>; // playerId → fitness lost during match
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(players: Player[], attrKey: keyof Player["attributes"]): Player {
  if (players.length === 0) return players[0];
  const weights = players.map(p => Math.max(1, p.attributes[attrKey]));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < players.length; i++) {
    r -= weights[i];
    if (r <= 0) return players[i];
  }
  return players[players.length - 1];
}

// Fitness decay rates per position category (per 90min)
function getFitnessDecay(p: Player, mentality: string): number {
  const base = 12 + Math.random() * 8; // 12-20 base
  const physicalBonus = (p.attributes.physical / 100) * 5; // fitter players lose less
  const posMultiplier =
    p.positionCategory === "GK" ? 0.3 :
    p.positionCategory === "DEF" ? 0.9 :
    p.positionCategory === "MID" ? 1.15 :
    1.05; // FWD
  
  let mentMultiplier = 1.0;
  if (mentality === "attacking") mentMultiplier = 1.25; // 25% more fatigue
  if (mentality === "defensive") mentMultiplier = 0.8; // 20% less fatigue

  return Math.max(4, (base - physicalBonus) * posMultiplier * mentMultiplier);
}



function getGKRating(players: Player[]): number {
  const gk = players.find(p => p.position === "GK");
  if (!gk) return 40;
  return gk.attributes.goalkeeping * 0.7 + gk.attributes.physical * 0.15 + gk.attributes.pace * 0.15;
}

function getAttackingPlayers(players: Player[]): Player[] {
  return players.filter(p => ["ST", "CF", "LW", "RW", "CAM"].includes(p.position));
}

function getMidfieldPlayers(players: Player[]): Player[] {
  return players.filter(p => ["CM", "CDM", "CAM", "LM", "RM"].includes(p.position));
}

function getDefensivePlayers(players: Player[]): Player[] {
  return players.filter(p => ["CB", "LB", "RB"].includes(p.position));
}

function getGoalkeeper(players: Player[]): Player | undefined {
  return players.find(p => p.position === "GK");
}

// Commentary templates
const GOAL_COMMENTARY = [
  (p: string, club: string) => `GOOOOOOL! ${p} não perdoa e marca para o ${club}!`,
  (p: string, club: string) => `É GOL! ${p} balança as redes pelo ${club}! A torcida explode!`,
  (p: string, club: string) => `GOLAÇO! ${p} manda pra rede! Que jogada do ${club}!`,
  (p: string, club: string) => `GOL DO ${club.toUpperCase()}! ${p} estava no lugar certo, na hora certa!`,
  (p: string, club: string) => `QUE GOLAÇO! ${p} solta uma bomba e marca para o ${club}!`,
];

const GOAL_ASSIST_COMMENTARY = [
  (p: string, a: string, club: string) => `GOOOOL! ${a} serve ${p} que finaliza sem chances para o goleiro! ${club} marca!`,
  (p: string, a: string, club: string) => `É GOL! Bela jogada de ${a}, que encontra ${p} livre. Gol do ${club}!`,
  (p: string, a: string, club: string) => `GOLAÇO! ${a} lança ${p} em profundidade, e ele não desperdiça! ${club} vibra!`,
];

const CORNER_GOAL_COMMENTARY = [
  (p: string, club: string) => `GOL DE CABEÇA! ${p} sobe mais que todo mundo e marca pro ${club}!`,
  (p: string, club: string) => `GOLAÇO! ${p} cabeceia com força no canto! ${club} marca na bola parada!`,
  (p: string, club: string) => `É GOL! ${p} aparece na segunda trave e testa pro fundo das redes! ${club}!`,
];

const CHANCE_COMMENTARY = [
  (p: string) => `${p} recebe na entrada da área e finaliza... mas a bola vai por cima do travessão!`,
  (p: string) => `Chegou ${p}! Cruzamento na área, ele cabeceia, mas manda pra fora!`,
  (p: string) => `${p} tenta o chute de longe... a bola desvia e sai pela linha de fundo!`,
  (p: string) => `Boa jogada! ${p} invade a área, mas escorrega na hora de finalizar!`,
];

const SAVE_COMMENTARY = [
  (p: string, gk: string) => `${p} finaliza com força! Grande defesa do goleiro ${gk}!`,
  (p: string, gk: string) => `Que defesaça! ${p} chuta no canto, mas ${gk} voa e espalma!`,
  (p: string, gk: string) => `${p} solta uma bomba! ${gk} se estica todo e faz a defesa do jogo!`,
];

const FOUL_COMMENTARY = [
  (p: string) => `Falta dura em ${p}. O juiz marca e mostra a mão para o jogador se levantar.`,
  (p: string) => `${p} é derrubado no meio-campo. Falta marcada.`,
  (p: string) => `Falta em ${p}! O lance foi duro e o árbitro para o jogo.`,
];

const YELLOW_COMMENTARY = [
  (p: string) => `🟨 Cartão amarelo! ${p} entra forte demais e o árbitro não perdoa!`,
  (p: string) => `🟨 Amarelo para ${p}! Falta tática e o juiz anota o nome dele.`,
];

const RED_COMMENTARY = [
  (p: string) => `🟥 EXPULSO! ${p} recebe o cartão vermelho! Entrada muito dura!`,
  (p: string) => `🟥 Vermelho direto para ${p}! O time fica com um a menos!`,
];

const CORNER_COMMENTARY = [
  (club: string) => `Escanteio para o ${club}. A bola é colocada na área...`,
  (club: string) => `Cobrança de escanteio do ${club}. A zaga afasta!`,
];

const PENALTY_COMMENTARY = [
  (club: string) => `O juiz aponta para a marca da cal! Pênalti para o ${club}!`,
  (club: string) => `Falta dentro da área! É PÊNALTI para o ${club}!`,
];

const PENALTY_GOAL_COMMENTARY = [
  (p: string, club: string) => `GOOOOL DE PÊNALTI! ${p} bate com categoria e marca para o ${club}!`,
  (p: string) => `É GOL! ${p} desloca o goleiro e converte a cobrança!`,
];

const PENALTY_MISS_COMMENTARY = [
  (p: string, gk: string) => `DEFENDEU ${gk}! ${p} bate mal e o goleiro salva!`,
  (p: string) => `PRA FORAAA! ${p} isola a cobrança de pênalti!`,
];

const COUNTER_ATTACK_COMMENTARY = [
  (club: string) => `O ${club} recupera a bola e parte em um contra-ataque rápido!`,
  (club: string) => `Atenção para o contra-golpe veloz do ${club}!`,
];

const SUBSTITUTION_COMMENTARY = [
  (pOut: string, pIn: string, club: string) => `🔄 Substituição no ${club}: sai ${pOut}, entra ${pIn}.`,
  (pOut: string, pIn: string, club: string) => `🔄 Mexida no ${club}! ${pOut} dá lugar a ${pIn}.`,
  (pOut: string, pIn: string, club: string) => `🔄 Troca no ${club}: ${pIn} vai a campo no lugar de ${pOut}.`,
];

const INJURY_COMMENTARY = [
  (p: string) => `🏥 ${p} sentiu dores e pede atendimento médico! O jogador não consegue continuar.`,
  (p: string) => `🏥 Que azar! ${p} se machuca em uma dividida e precisa ser substituído.`,
  (p: string) => `🏥 Problema muscular para ${p}! Ele sai de campo mancando.`,
  (p: string) => `🏥 ${p} cai no gramado com dores. A equipe médica entra para atendê-lo.`,
];

// V2 Phase 2: Build-up play commentary
const BUILDUP_COMMENTARY = [
  (p1: string, p2: string, p3: string) => `Bela troca de passes! ${p1} toca para ${p2}, que encontra ${p3} em profundidade!`,
  (p1: string, p2: string, p3: string) => `Jogada ensaiada! ${p1} para ${p2}, tabelinha com ${p3}!`,
  (p1: string, p2: string, p3: string) => `${p1} conduz, acha ${p2} pelo meio, que abre para ${p3} na frente!`,
  (p1: string, p2: string, p3: string) => `Circulação rápida: ${p1} → ${p2} → ${p3}! O time toca a bola com categoria!`,
];

const LONG_RANGE_GOAL_COMMENTARY = [
  (p: string, club: string) => `GOLAÇO DE FORA DA ÁREA! ${p} solta uma bomba e marca um golaço pelo ${club}!`,
  (p: string, club: string) => `QUE CHUTE! ${p} arrisca de longe e a bola entra no ângulo! ${club} marca!`,
  (p: string, club: string) => `IMPRESSIONANTE! ${p} pega de primeira de fora da área e o goleiro só olha! Gol do ${club}!`,
];

const SOLO_RUN_GOAL_COMMENTARY = [
  (p: string, club: string) => `GOLAÇO INDIVIDUAL! ${p} parte em velocidade, passa por dois marcadores e finaliza! ${club}!`,
  (p: string, club: string) => `QUE JOGADA DE ${p.toUpperCase()}! Arrancada sensacional, dribla o zagueiro e chuta no canto! ${club}!`,
];

const CROSS_HEADER_COMMENTARY = [
  (crosser: string, header: string, club: string) => `Cruzamento perfeito de ${crosser}! ${header} sobe e cabeceia pro gol! ${club} marca!`,
  (crosser: string, header: string, club: string) => `${crosser} levanta na área, ${header} aparece na segunda trave e é gol do ${club}!`,
];

const INTERCEPTION_COMMENTARY = [
  (p: string) => `${p} faz um corte preciso e desarma o ataque adversário!`,
  (p: string) => `Bela interceptação de ${p}! O ataque é anulado.`,
  (p: string) => `${p} lê a jogada e antecipa o passe! Posse recuperada.`,
];

export function simulateMatch(
  homeClub: Club,
  awayClub: Club,
  homePlayers: Player[],
  awayPlayers: Player[],
): MatchResult {
  // V2: Zone-based strength + momentum + AI mentality
  const homeAdvantage = calcHomeAdvantage(homeClub.infrastructure);
  const momentum = createMomentum();
  // Track dynamic possession across all minutes
  let possessionMinutesHome = 0;
  let possessionMinutesTotal = 0;

  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0, awayShots = 0;
  let homeSoT = 0, awaySoT = 0;
  let homeFouls = 0, awayFouls = 0;
  let homeCorners = 0, awayCorners = 0;

  // Fitness impact tracking
  const fitnessImpact = new Map<number, number>();
  for (const p of homePlayers) fitnessImpact.set(p.id, getFitnessDecay(p, homeClub.mentality));
  for (const p of awayPlayers) fitnessImpact.set(p.id, getFitnessDecay(p, awayClub.mentality));

  // Track player performance for MOTM
  const playerPerformance = new Map<string, { goals: number; assists: number; saves: number; team: "home" | "away"; ca: number }>();

  function trackPerf(name: string, team: "home" | "away", goals = 0, assists = 0, saves = 0, ca = 0) {
    const existing = playerPerformance.get(name) || { goals: 0, assists: 0, saves: 0, team, ca };
    existing.goals += goals;
    existing.assists += assists;
    existing.saves += saves;
    if (ca > existing.ca) existing.ca = ca;
    playerPerformance.set(name, existing);
  }

  // Kickoff
  events.push({
    minute: 0, type: "kickoff", team: "neutral",
    playerName: "", description: "Começa o jogo!",
    commentary: `O árbitro apita! Começa ${homeClub.shortName} x ${awayClub.shortName}!`,
    importance: "medium",
  });

  const usedMinutes = new Set<number>();
  const totalChances = rand(14, 24);

  // Phase 3: Mutable active player lists + bench + sub/card tracking
  const homeActive = [...homePlayers.slice(0, Math.min(11, homePlayers.length))];
  const awayActive = [...awayPlayers.slice(0, Math.min(11, awayPlayers.length))];
  const homeBench = homePlayers.slice(11);
  const awayBench = awayPlayers.slice(11);
  let homeSubsUsed = 0;
  let awaySubsUsed = 0;
  const MAX_SUBS = 5;
  const homeYellows = new Map<number, number>(); // playerId → yellow count
  const awayYellows = new Map<number, number>();

  // Helper: find best bench replacement for a position
  function findBenchReplacement(bench: Player[], posCategory: string): Player | undefined {
    const samePosPlayer = bench.find(p => p.positionCategory === posCategory);
    return samePosPlayer || bench[0];
  }

  // Helper: perform substitution
  function performSub(
    active: Player[], bench: Player[], playerOut: Player,
    team: "home" | "away", minute: number, reason: string
  ): boolean {
    const subsUsed = team === "home" ? homeSubsUsed : awaySubsUsed;
    if (subsUsed >= MAX_SUBS || bench.length === 0) return false;

    const replacement = findBenchReplacement(bench, playerOut.positionCategory);
    if (!replacement) return false;

    // Remove from active, add replacement
    const idx = active.indexOf(playerOut);
    if (idx > -1) active.splice(idx, 1);
    const benchIdx = bench.indexOf(replacement);
    if (benchIdx > -1) bench.splice(benchIdx, 1);
    active.push(replacement);

    if (team === "home") homeSubsUsed++; else awaySubsUsed++;

    const clubName = team === "home" ? homeClub.shortName : awayClub.shortName;
    events.push({
      minute, type: "substitution", team,
      playerName: playerOut.name,
      assistName: replacement.name,
      description: `🔄 ${reason}: sai ${playerOut.name}, entra ${replacement.name}`,
      commentary: pick(SUBSTITUTION_COMMENTARY)(playerOut.name, replacement.name, clubName),
      importance: "medium",
    });

    // Track fitness for substituted player
    fitnessImpact.set(replacement.id, getFitnessDecay(replacement, team === "home" ? homeClub.mentality : awayClub.mentality) * ((90 - minute) / 90));
    return true;
  }

  for (let i = 0; i < totalChances; i++) {
    let minute: number;
    do {
      minute = rand(1, 90);
    } while (usedMinutes.has(minute));
    usedMinutes.add(minute);


    // V2: AI tactical adjustments based on score
    const scoreDiffHome = homeGoals - awayGoals;
    const currentHomeMentality = getAIMentality(homeClub.mentality, scoreDiffHome, minute);
    const currentAwayMentality = getAIMentality(awayClub.mentality, -scoreDiffHome, minute);

    const homeMod = getMentalityModifier(currentHomeMentality);
    const awayMod = getMentalityModifier(currentAwayMentality);

    // V2: Calculate zone strengths with effective CA
    const homeZones = calcZoneStrengths(homeActive, minute, scoreDiffHome);
    const awayZones = calcZoneStrengths(awayActive, minute, -scoreDiffHome);

    // Apply home advantage bonus to home zones
    for (const key of Object.keys(homeZones) as (keyof ZoneStrengths)[]) {
      homeZones[key] += homeAdvantage;
    }

    // Apply momentum
    for (const key of Object.keys(homeZones) as (keyof ZoneStrengths)[]) {
      if (key.startsWith("ATK")) homeZones[key] *= momentum.home;
      if (key.startsWith("ATK")) awayZones[key] *= momentum.away;
    }

    // V2: Dynamic possession per minute
    const minutePossession = calcPossession(homeZones, awayZones);
    possessionMinutesHome += minutePossession;
    possessionMinutesTotal++;

    // V2: Attack progression through zones
    const isHome = Math.random() < minutePossession;
    const team = isHome ? "home" as const : "away" as const;
    const atkZones = isHome ? homeZones : awayZones;
    const defZones = isHome ? awayZones : homeZones;
    const atkMod = isHome ? homeMod.atk : awayMod.atk;
    const defMod = isHome ? awayMod.def : homeMod.def;

    const teamPlayers = isHome ? homeActive : awayActive;
    const opponentPlayers = isHome ? awayActive : homeActive;
    const clubName = isHome ? homeClub.shortName : awayClub.shortName;

    // V2: Attack must progress through zones
    const progression = attackProgression(atkZones, defZones, atkMod, defMod);

    // Tick momentum decay
    tickMomentum(momentum);

    // If attack fails in midfield or defense, generate foul or interception
    if (!progression.success) {
      if (Math.random() < 0.25) {
        const oppositeTeam = isHome ? "away" as const : "home" as const;
        const fouledPlayer = pick(teamPlayers);
        if (isHome) awayFouls++; else homeFouls++;
        events.push({
          minute: Math.max(1, minute - 1), type: "foul", team: oppositeTeam,
          playerName: fouledPlayer.name,
          description: `Falta em ${fouledPlayer.name}`,
          commentary: pick(FOUL_COMMENTARY)(fouledPlayer.name),
          importance: "low",
        });
      } else if (Math.random() < 0.4) {
        // V2 Phase 2: Interception narrative
        const defenders = getDefensivePlayers(opponentPlayers);
        const interceptor = defenders.length > 0 ? weightedPick(defenders, "defending") : pick(opponentPlayers);
        events.push({
          minute, type: "chance", team: isHome ? "away" : "home",
          playerName: interceptor.name,
          description: `Interceptação de ${interceptor.name}`,
          commentary: pick(INTERCEPTION_COMMENTARY)(interceptor.name),
          importance: "low",
        });
      }
      updateMomentum(momentum, isHome ? "home_chance" : "away_chance");
      continue;
    }

    // Attack reached final third — generate shot event
    if (isHome) homeShots++; else awayShots++;
    const oppGKRating = getGKRating(opponentPlayers);

    // V2: On-target chance based on zone strength comparison
    const atkZoneStr = atkZones[progression.zone] || 50;
    const defMirror = defZones[progression.zone.replace("ATK", "DEF") as keyof ZoneStrengths] || 50;
    let onTargetChance = Math.max(0.25, Math.min(0.75,
      (atkZoneStr / (atkZoneStr + defMirror)) * 0.5 + 0.25
    ));

    // Counter Attack (~10%)
    let isCounter = false;
    if (Math.random() < 0.1) {
      isCounter = true;
      onTargetChance += 0.15; // easier to hit target on counter
      events.push({
        minute: Math.max(1, minute - 1), type: "counter_attack", team,
        playerName: "", description: `Contra-ataque rápido!`,
        commentary: pick(COUNTER_ATTACK_COMMENTARY)(clubName),
        importance: "medium",
      });
    }

    // Penalty (~3%)
    if (!isCounter && Math.random() < 0.03) {
      const penaltyTaker = weightedPick(teamPlayers, "shooting");
      const gk = getGoalkeeper(opponentPlayers);
      const gkName = gk?.name || "Goleiro";
      
      events.push({
        minute, type: "penalty", team,
        playerName: penaltyTaker.name,
        description: `Pênalti para o ${clubName}!`,
        commentary: pick(PENALTY_COMMENTARY)(clubName),
        importance: "high",
      });
      
      const penaltyChance = 0.75 + (penaltyTaker.attributes.shooting / 100) * 0.15 - (oppGKRating / 100) * 0.1;
      if (Math.random() < penaltyChance) {
        if (isHome) { homeGoals++; homeSoT++; } else { awayGoals++; awaySoT++; }
        events.push({
          minute: minute + 1, type: "goal", team,
          playerName: penaltyTaker.name,
          description: `⚽ Gol de pênalti de ${penaltyTaker.name}!`,
          commentary: pick(PENALTY_GOAL_COMMENTARY)(penaltyTaker.name, clubName),
          importance: "high",
        });
        trackPerf(penaltyTaker.name, team, 1, 0, 0, penaltyTaker.currentAbility);
      } else {
        if (isHome) { homeSoT++; } else { awaySoT++; }
        events.push({
          minute: minute + 1, type: "save", team,
          playerName: penaltyTaker.name,
          description: `❌ Pênalti perdido por ${penaltyTaker.name}!`,
          commentary: pick(PENALTY_MISS_COMMENTARY)(penaltyTaker.name, gkName),
          importance: "high",
        });
        if (gk) trackPerf(gk.name, isHome ? "away" : "home", 0, 0, 1, gk.currentAbility);
      }
      continue; // Skip the rest of the normal chance logic
    }

    if (Math.random() < onTargetChance) {
      if (isHome) homeSoT++; else awaySoT++;

      // Scorer selection: weighted by shooting attribute
      const attackers = getAttackingPlayers(teamPlayers);
      const scorer = attackers.length > 0
        ? weightedPick(attackers, "shooting")
        : weightedPick(teamPlayers, "shooting");

      // Goal chance: scorer's shooting vs GK rating
      const scorerFinishing = scorer.attributes.shooting;
      const goalChance = Math.max(0.08, Math.min(0.55,
        (scorerFinishing / 100) * 0.38 + (1 - oppGKRating / 100) * 0.22
      ));

      if (Math.random() < goalChance) {
        // GOAL! V2 Phase 2: Determine goal type based on zone and player attributes
        if (isHome) homeGoals++; else awayGoals++;

        const midfielders = getMidfieldPlayers(teamPlayers);
        const defenders = getDefensivePlayers(teamPlayers);
        const wingers = teamPlayers.filter(p => ["LW", "RW", "LM", "RM", "LB", "RB"].includes(p.position));
        const headers = [...getAttackingPlayers(teamPlayers), ...defenders].filter(p => p.attributes.physical > 55);

        // Roll for goal type
        const goalTypeRoll = Math.random();
        let assister: Player | undefined;

        if (goalTypeRoll < 0.15 && midfielders.length >= 1 && (scorer.attributes.shooting > 60 || scorer.attributes.dribbling > 65)) {
          // LONG-RANGE GOAL (~15%)
          void pick(LONG_RANGE_GOAL_COMMENTARY)(scorer.name, clubName);
          // Build-up event before the goal
          if (midfielders.length >= 2) {
            const p1 = pick(defenders.length > 0 ? defenders : midfielders);
            const p2 = pick(midfielders);
            events.push({
              minute: Math.max(1, minute - 1), type: "chance", team,
              playerName: p2.name,
              description: `Construção de jogada`,
              commentary: pick(BUILDUP_COMMENTARY)(p1.name, p2.name, scorer.name),
              importance: "low",
            });
          }
        } else if (goalTypeRoll < 0.25 && scorer.attributes.pace > 60 && scorer.attributes.dribbling > 55) {
          // SOLO RUN GOAL (~10%)
          void pick(SOLO_RUN_GOAL_COMMENTARY)(scorer.name, clubName);
        } else if (goalTypeRoll < 0.40 && wingers.length > 0 && headers.length > 0) {
          // CROSS + HEADER GOAL (~15%)
          const crosser = weightedPick(wingers, "passing");
          const header = headers.length > 0 ? weightedPick(headers, "physical") : scorer;
          assister = crosser;
          void pick(CROSS_HEADER_COMMENTARY)(crosser.name, header.name, clubName);
          // Override scorer to the header if different
          if (header.id !== scorer.id) {
            trackPerf(header.name, team, 1, 0, 0, header.currentAbility);
            trackPerf(crosser.name, team, 0, 1, 0, crosser.currentAbility);
            events.push({
              minute, type: "goal", team,
              playerName: header.name,
              assistName: crosser.name,
              description: `⚽ ${header.name} marca de cabeça! Assist: ${crosser.name}`,
              commentary: pick(CROSS_HEADER_COMMENTARY)(crosser.name, header.name, clubName),
              importance: "high",
            });
            updateMomentum(momentum, isHome ? "home_goal" : "away_goal");
            continue; // Skip default goal push below
          }
        } else {
          // REGULAR GOAL with build-up chain (~60%)
          const hasAssist = midfielders.length > 0 && Math.random() > 0.3;
          assister = hasAssist ? weightedPick(midfielders, "passing") : undefined;

          // V2 Phase 2: Build-up event before goal (~50% of regular goals)
          if (Math.random() < 0.5 && midfielders.length >= 1) {
            const p1 = pick(defenders.length > 0 ? defenders : teamPlayers);
            const p2 = pick(midfielders);
            const p3 = assister || scorer;
            events.push({
              minute: Math.max(1, minute - 1), type: "chance", team,
              playerName: p2.name,
              description: `Construção de jogada`,
              commentary: pick(BUILDUP_COMMENTARY)(p1.name, p2.name, p3.name),
              importance: "low",
            });
          }

          void (assister
            ? pick(GOAL_ASSIST_COMMENTARY)(scorer.name, assister.name, clubName)
            : pick(GOAL_COMMENTARY)(scorer.name, clubName));
        }

        events.push({
          minute, type: "goal", team,
          playerName: scorer.name,
          assistName: assister?.name,
          description: assister
            ? `⚽ ${scorer.name} marca! Assist: ${assister.name}`
            : `⚽ ${scorer.name} marca!`,
          commentary: assister
            ? pick(GOAL_ASSIST_COMMENTARY)(scorer.name, assister.name, clubName)
            : pick(GOAL_COMMENTARY)(scorer.name, clubName),
          importance: "high",
        });

        trackPerf(scorer.name, team, 1, 0, 0, scorer.currentAbility);
        if (assister) trackPerf(assister.name, team, 0, 1, 0, assister.currentAbility);
        updateMomentum(momentum, isHome ? "home_goal" : "away_goal");
      } else {
        // Save by goalkeeper
        const gk = getGoalkeeper(opponentPlayers);
        const gkName = gk?.name || "o goleiro";

        events.push({
          minute, type: "save", team,
          playerName: scorer.name,
          description: `Defesa do goleiro!`,
          commentary: pick(SAVE_COMMENTARY)(scorer.name, gkName),
          importance: "medium",
        });

        if (gk) trackPerf(gk.name, isHome ? "away" : "home", 0, 0, 1, gk.currentAbility);
      }
    } else {
      // Missed / blocked → possible corner
      const shooter = pick(teamPlayers);

      if (Math.random() < 0.4) {
        if (isHome) homeCorners++; else awayCorners++;

        // E2: Corner can produce a headed goal chance (~18%)
        if (Math.random() < 0.12) {
          const defenders = getDefensivePlayers(teamPlayers);
          const attackersForHeader = getAttackingPlayers(teamPlayers);
          const headerCandidates = [...defenders, ...attackersForHeader].filter(p => p.attributes.physical > 50);
          if (headerCandidates.length > 0) {
            const header = weightedPick(headerCandidates, "physical");
            const headerChance = (header.attributes.physical / 100) * 0.25 + 0.08;
            if (Math.random() < headerChance) {
              // HEADER GOAL from corner!
              if (isHome) { homeGoals++; homeSoT++; homeShots++; } else { awayGoals++; awaySoT++; awayShots++; }
              events.push({
                minute, type: "goal", team,
                playerName: header.name,
                description: `⚽ ${header.name} marca de cabeça no escanteio!`,
                commentary: pick(CORNER_GOAL_COMMENTARY)(header.name, clubName),
                importance: "high",
              });
              trackPerf(header.name, team, 1, 0, 0, header.currentAbility);
            } else {
              events.push({
                minute, type: "corner", team,
                playerName: header.name, description: `Escanteio para ${clubName}`,
                commentary: `Cobrança de escanteio do ${clubName}. ${header.name} cabeceia, mas a zaga afasta!`,
                importance: "low",
              });
            }
          } else {
            events.push({
              minute, type: "corner", team,
              playerName: "", description: `Escanteio para ${clubName}`,
              commentary: pick(CORNER_COMMENTARY)(clubName),
              importance: "low",
            });
          }
        } else {
          events.push({
            minute, type: "corner", team,
            playerName: "", description: `Escanteio para ${clubName}`,
            commentary: pick(CORNER_COMMENTARY)(clubName),
            importance: "low",
          });
        }
      } else {
        events.push({
          minute, type: "miss", team,
          playerName: shooter.name,
          description: `${shooter.name} finaliza pra fora`,
          commentary: pick(CHANCE_COMMENTARY)(shooter.name),
          importance: "low",
        });
      }
    }

    // Phase 3: Cards with real consequences
    if (Math.random() < 0.06) {
      const cardTeam = isHome ? "away" as const : "home" as const;
      const cardPlayers = cardTeam === "home" ? homeActive : awayActive;
      const yellowMap = cardTeam === "home" ? homeYellows : awayYellows;
      const fieldPlayers = cardPlayers.filter(p => p.position !== "GK");
      if (fieldPlayers.length > 0) {
        const cardPlayer = weightedPick(fieldPlayers, "physical"); // aggressive players foul more
        const prevYellows = yellowMap.get(cardPlayer.id) || 0;

        if (prevYellows === 0 && Math.random() < 0.85) {
          // First yellow
          yellowMap.set(cardPlayer.id, 1);
          events.push({
            minute, type: "yellow_card", team: cardTeam,
            playerName: cardPlayer.name,
            description: `🟨 ${cardPlayer.name}`,
            commentary: pick(YELLOW_COMMENTARY)(cardPlayer.name),
            importance: "medium",
          });
        } else if (prevYellows === 1) {
          // Second yellow → Red!
          yellowMap.set(cardPlayer.id, 2);
          events.push({
            minute, type: "yellow_card", team: cardTeam,
            playerName: cardPlayer.name,
            description: `🟨🟨 Segundo amarelo para ${cardPlayer.name}!`,
            commentary: `🟨 Segundo cartão amarelo! ${cardPlayer.name} já tinha amarelo e agora recebe outro!`,
            importance: "high",
          });
          events.push({
            minute, type: "red_card", team: cardTeam,
            playerName: cardPlayer.name,
            description: `🟥 ${cardPlayer.name} expulso por duplo amarelo!`,
            commentary: `🟥 EXPULSO! ${cardPlayer.name} leva o segundo amarelo e está fora do jogo! O time fica com ${cardPlayers.length - 1} jogadores!`,
            importance: "high",
            suspensionDays: 1,
          });
          // Remove from field
          const idx = cardPlayers.indexOf(cardPlayer);
          if (idx > -1) cardPlayers.splice(idx, 1);
          void cardTeam; // red card counters removed, side effect already applied via events
        } else {
          // Straight red (~15% of card situations)
          events.push({
            minute, type: "red_card", team: cardTeam,
            playerName: cardPlayer.name,
            description: `🟥 ${cardPlayer.name} expulso!`,
            commentary: pick(RED_COMMENTARY)(cardPlayer.name),
            importance: "high",
            suspensionDays: 1,
          });
          const idx = cardPlayers.indexOf(cardPlayer);
          if (idx > -1) cardPlayers.splice(idx, 1);
        }
      }
    }

    // Phase 3: In-game injuries (4% chance per event, increased up to 12% if tired players are on the field)
    const hasTiredPlayers = (isHome ? homeActive : awayActive).some(p => p.fitness < 65);
    const injuryChance = hasTiredPlayers ? 0.06 : 0.015;
    if (Math.random() < injuryChance) {
      const injTeam = isHome ? "home" as const : "away" as const;
      const injActive = injTeam === "home" ? homeActive : awayActive;
      const injBench = injTeam === "home" ? homeBench : awayBench;
      const injFieldPlayers = injActive.filter(p => p.position !== "GK");
      if (injFieldPlayers.length > 0) {
        // Weighted pick: players with fitness < 75 are 3x more likely to be selected
        const weights = injFieldPlayers.map(p => p.fitness < 75 ? 3 : 1);
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * totalWeight;
        let injPlayer = injFieldPlayers[injFieldPlayers.length - 1];
        for (let idx = 0; idx < injFieldPlayers.length; idx++) {
          r -= weights[idx];
          if (r <= 0) {
            injPlayer = injFieldPlayers[idx];
            break;
          }
        }
        
        const injuryDays = rand(7, 42);
        events.push({
          minute, type: "injury", team: injTeam,
          playerName: injPlayer.name,
          description: `🏥 ${injPlayer.name} se lesionou!`,
          commentary: pick(INJURY_COMMENTARY)(injPlayer.name),
          importance: "high",
          injuryDays,
        });
        // Try forced substitution
        performSub(injActive, injBench, injPlayer, injTeam, minute, "Lesão");
      }
    }

    // Phase 3: Auto-subs for fatigue at 60+ minutes
    if (minute >= 60 && Math.random() < 0.12) {
      const subTeam = isHome ? "home" as const : "away" as const;
      const subActive = subTeam === "home" ? homeActive : awayActive;
      const subBench = subTeam === "home" ? homeBench : awayBench;
      const subsUsed = subTeam === "home" ? homeSubsUsed : awaySubsUsed;
      if (subsUsed < MAX_SUBS && subBench.length > 0) {
        const tiredPlayers = subActive
          .filter(p => p.position !== "GK")
          .sort((a, b) => a.fitness - b.fitness);
        if (tiredPlayers.length > 0 && tiredPlayers[0].fitness < 60) {
          performSub(subActive, subBench, tiredPlayers[0], subTeam, minute, "Cansaço");
        }
      }
    }
  }

  // Halftime
  events.push({
    minute: 45, type: "halftime", team: "neutral",
    playerName: "", description: "Intervalo",
    commentary: `Fim do primeiro tempo! ${homeClub.shortName} ${homeGoals} × ${awayGoals} ${awayClub.shortName}`,
    importance: "medium",
  });

  // Phase 3: Halftime tactical subs (if bench available)
  for (const subTeam of ["home", "away"] as const) {
    const active = subTeam === "home" ? homeActive : awayActive;
    const bench = subTeam === "home" ? homeBench : awayBench;
    const subsUsed = subTeam === "home" ? homeSubsUsed : awaySubsUsed;
    if (subsUsed < MAX_SUBS && bench.length > 0) {
      // Sub the most tired non-GK player if fitness < 55
      const tired = active
        .filter(p => p.position !== "GK")
        .sort((a, b) => a.fitness - b.fitness);
      if (tired.length > 0 && tired[0].fitness < 55) {
        performSub(active, bench, tired[0], subTeam, 46, "Intervalo");
      }
    }
  }

  // Fulltime
  events.push({
    minute: 90, type: "fulltime", team: "neutral",
    playerName: "", description: "Fim de jogo!",
    commentary: `Apita o árbitro! Fim de jogo! ${homeClub.shortName} ${homeGoals} × ${awayGoals} ${awayClub.shortName}`,
    importance: "high",
  });

  events.sort((a, b) => a.minute - b.minute);

  // Determine Man of the Match
  let motm: MatchResult["motm"] = undefined;
  let bestScore = -1;
  for (const [name, perf] of playerPerformance) {
    const score = perf.goals * 3 + perf.assists * 2 + perf.saves * 1.5 + (perf.ca / 100) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      motm = { name, team: perf.team, rating: Math.min(10, Math.round((6 + score) * 10) / 10) };
    }
  }

  // V2: Calculate final dynamic possession
  const finalHomePoss = possessionMinutesTotal > 0
    ? Math.round((possessionMinutesHome / possessionMinutesTotal) * 100)
    : 50;

  // V2: Team ratings normalized to 0-100 scale
  const homeAvgCA = homePlayers.length > 0 ? homePlayers.reduce((s, p) => s + p.currentAbility, 0) / homePlayers.length : 50;
  const awayAvgCA = awayPlayers.length > 0 ? awayPlayers.reduce((s, p) => s + p.currentAbility, 0) / awayPlayers.length : 50;
  const homeRatingCalc = Math.min(99, Math.max(20, homeAvgCA * 0.7 + (homeGoals > awayGoals ? 8 : homeGoals === awayGoals ? 3 : -2) + Math.random() * 6));
  const awayRatingCalc = Math.min(99, Math.max(20, awayAvgCA * 0.7 + (awayGoals > homeGoals ? 8 : awayGoals === homeGoals ? 3 : -2) + Math.random() * 6));

  return {
    homeClub, awayClub,
    homeGoals, awayGoals,
    events,
    homeRating: Math.round(homeRatingCalc * 10) / 10,
    awayRating: Math.round(awayRatingCalc * 10) / 10,
    possession: { home: finalHomePoss, away: 100 - finalHomePoss },
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: { home: homeSoT, away: awaySoT },
    fouls: { home: homeFouls, away: awayFouls },
    corners: { home: homeCorners, away: awayCorners },
    motm,
    fitnessImpact,
  };
}