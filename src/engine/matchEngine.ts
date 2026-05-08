import type { Player, Club } from "../types/game";

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "injury"
    | "chance" | "save" | "miss" | "foul" | "corner" | "kickoff" | "halftime" | "fulltime";
  team: "home" | "away" | "neutral";
  playerName: string;
  assistName?: string;
  description: string;
  commentary: string;
  importance: "low" | "medium" | "high";
  injuryDays?: number; // E3: Added injury severity
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
function getFitnessDecay(p: Player): number {
  const base = 8 + Math.random() * 6; // 8-14 base
  const physicalBonus = (p.attributes.physical / 100) * 4; // fitter players lose less
  const posMultiplier =
    p.positionCategory === "GK" ? 0.4 :
    p.positionCategory === "DEF" ? 0.85 :
    p.positionCategory === "MID" ? 1.1 :
    1.0; // FWD
  return Math.max(3, (base - physicalBonus) * posMultiplier);
}

function getTeamStrength(players: Player[], mentality: string, minuteRatio = 0): number {
  if (players.length === 0) return 40;
  const avgCA = players.reduce((s, p) => s + p.currentAbility, 0) / players.length;
  const avgFitness = players.reduce((s, p) => s + p.fitness, 0) / players.length;
  const avgMorale = players.reduce((s, p) => s + p.morale, 0) / players.length;

  // Fatigue penalty grows as match progresses (0 at min 0, up to -6 at min 90)
  const fatiguePenalty = minuteRatio * 6 * (1 - avgFitness / 120);

  let strength = avgCA * 0.6 + (avgFitness / 100) * 20 + (avgMorale / 100) * 15 - fatiguePenalty;
  if (mentality === "attacking") strength += 3;
  if (mentality === "defensive") strength -= 2;
  return Math.max(20, Math.min(95, strength));
}

function getAttackStrength(players: Player[]): number {
  const attackers = players.filter(p => ["ST", "CF", "LW", "RW", "CAM"].includes(p.position));
  if (attackers.length === 0) return 50;
  const avg = attackers.reduce((s, p) => s + p.attributes.shooting * 0.4 + p.attributes.pace * 0.2 + p.attributes.dribbling * 0.3 + p.attributes.physical * 0.1, 0) / attackers.length;
  return avg;
}

function getDefenseStrength(players: Player[]): number {
  const defenders = players.filter(p => ["CB", "LB", "RB", "CDM"].includes(p.position));
  if (defenders.length === 0) return 50;
  const avg = defenders.reduce((s, p) => s + p.attributes.defending * 0.45 + p.attributes.physical * 0.25 + p.attributes.pace * 0.15 + p.attributes.passing * 0.15, 0) / defenders.length;
  return avg;
}

function getMidfieldControl(players: Player[]): number {
  const mids = players.filter(p => ["CM", "CDM", "CAM", "LM", "RM"].includes(p.position));
  if (mids.length === 0) return 50;
  const avg = mids.reduce((s, p) => s + p.attributes.passing * 0.35 + p.attributes.dribbling * 0.25 + p.attributes.physical * 0.2 + p.attributes.defending * 0.2, 0) / mids.length;
  return avg;
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

export function simulateMatch(
  homeClub: Club,
  awayClub: Club,
  homePlayers: Player[],
  awayPlayers: Player[],
): MatchResult {
  const homeStrength = getTeamStrength(homePlayers, homeClub.mentality) + 4; // home advantage
  const awayStrength = getTeamStrength(awayPlayers, awayClub.mentality);

  // Attribute-aware sub-ratings
  const homeAttack = getAttackStrength(homePlayers);
  const homeDefense = getDefenseStrength(homePlayers);
  const homeMidfield = getMidfieldControl(homePlayers);
  const homeGK = getGKRating(homePlayers);

  const awayAttack = getAttackStrength(awayPlayers);
  const awayDefense = getDefenseStrength(awayPlayers);
  const awayMidfield = getMidfieldControl(awayPlayers);
  const awayGK = getGKRating(awayPlayers);

  // Possession based on midfield control
  const midRatio = (homeMidfield + 5) / (homeMidfield + awayMidfield + 5); // +5 home bias
  const homePossession = Math.round(Math.max(30, Math.min(70, midRatio * 100)));

  // Chance distribution based on possession + attack
  const homeChanceRatio = (homeStrength + homeAttack * 0.3) / (homeStrength + awayStrength + (homeAttack + awayAttack) * 0.3);

  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0, awayShots = 0;
  let homeSoT = 0, awaySoT = 0;
  let homeFouls = 0, awayFouls = 0;
  let homeCorners = 0, awayCorners = 0;

  // Fitness impact tracking
  const fitnessImpact = new Map<number, number>();
  for (const p of [...homePlayers, ...awayPlayers]) {
    fitnessImpact.set(p.id, getFitnessDecay(p));
  }

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
  const totalChances = rand(10, 22);

  for (let i = 0; i < totalChances; i++) {
    let minute: number;
    do {
      minute = rand(1, 90);
    } while (usedMinutes.has(minute));
    usedMinutes.add(minute);

    const minuteRatio = minute / 90; // for fatigue calculations
    const isHome = Math.random() < homeChanceRatio;
    const team = isHome ? "home" as const : "away" as const;
    const teamPlayers = isHome ? homePlayers : awayPlayers;
    const opponentPlayers = isHome ? awayPlayers : homePlayers;
    const clubName = isHome ? homeClub.shortName : awayClub.shortName;

    // Per-team attack vs opponent defense (with fatigue factor)
    const fatigueMod = 1 - minuteRatio * 0.12; // up to 12% weaker at 90min
    const attackRating = (isHome ? homeAttack : awayAttack) * fatigueMod;
    const oppDefenseRating = (isHome ? awayDefense : homeDefense) * fatigueMod;
    const oppGKRating = isHome ? awayGK : homeGK;

    // Foul events (~30%)
    if (Math.random() < 0.3) {
      const oppositeTeam = isHome ? "away" as const : "home" as const;
      const fouledPlayer = pick(teamPlayers);
      if (isHome) awayFouls++; else homeFouls++;

      events.push({
        minute: Math.max(1, minute - 1),
        type: "foul", team: oppositeTeam,
        playerName: fouledPlayer.name,
        description: `Falta em ${fouledPlayer.name}`,
        commentary: pick(FOUL_COMMENTARY)(fouledPlayer.name),
        importance: "low",
      });
    }

    // Shot attempt
    if (isHome) homeShots++; else awayShots++;

    // On-target chance: attack vs defense
    const onTargetChance = Math.max(0.15, Math.min(0.65,
      (attackRating / 100) * 0.5 + (1 - oppDefenseRating / 100) * 0.3 + 0.1
    ));

    if (Math.random() < onTargetChance) {
      if (isHome) homeSoT++; else awaySoT++;

      // Scorer selection: weighted by shooting attribute
      const attackers = getAttackingPlayers(teamPlayers);
      const scorer = attackers.length > 0
        ? weightedPick(attackers, "shooting")
        : weightedPick(teamPlayers, "shooting");

      // Goal chance: scorer's shooting vs GK rating
      const scorerFinishing = scorer.attributes.shooting;
      const goalChance = Math.max(0.15, Math.min(0.7,
        (scorerFinishing / 100) * 0.55 + (1 - oppGKRating / 100) * 0.35
      ));

      if (Math.random() < goalChance) {
        // GOAL!
        if (isHome) homeGoals++; else awayGoals++;

        const midfielders = getMidfieldPlayers(teamPlayers);
        const hasAssist = midfielders.length > 0 && Math.random() > 0.3;
        const assister = hasAssist ? weightedPick(midfielders, "passing") : undefined;

        const commentary = assister
          ? pick(GOAL_ASSIST_COMMENTARY)(scorer.name, assister.name, clubName)
          : pick(GOAL_COMMENTARY)(scorer.name, clubName);

        events.push({
          minute, type: "goal", team,
          playerName: scorer.name,
          assistName: assister?.name,
          description: assister
            ? `⚽ ${scorer.name} marca! Assist: ${assister.name}`
            : `⚽ ${scorer.name} marca!`,
          commentary,
          importance: "high",
        });

        trackPerf(scorer.name, team, 1, 0, 0, scorer.currentAbility);
        if (assister) trackPerf(assister.name, team, 0, 1, 0, assister.currentAbility);
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
        if (Math.random() < 0.18) {
          const defenders = getDefensivePlayers(teamPlayers);
          const attackersForHeader = getAttackingPlayers(teamPlayers);
          const headerCandidates = [...defenders, ...attackersForHeader].filter(p => p.attributes.physical > 50);
          if (headerCandidates.length > 0) {
            const header = weightedPick(headerCandidates, "physical");
            const headerChance = (header.attributes.physical / 100) * 0.5 + 0.15;
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

    // Cards
    if (Math.random() < 0.08) {
      const cardPlayer = pick(teamPlayers);
      events.push({
        minute, type: "yellow_card", team,
        playerName: cardPlayer.name,
        description: `🟨 ${cardPlayer.name}`,
        commentary: pick(YELLOW_COMMENTARY)(cardPlayer.name),
        importance: "medium",
      });
    }

    if (Math.random() < 0.015) {
      const redPlayer = pick(teamPlayers);
      events.push({
        minute, type: "red_card", team,
        playerName: redPlayer.name,
        description: `🟥 ${redPlayer.name} expulso!`,
        commentary: pick(RED_COMMENTARY)(redPlayer.name),
        importance: "high",
      });
    }
  }

  // Halftime
  events.push({
    minute: 45, type: "halftime", team: "neutral",
    playerName: "", description: "Intervalo",
    commentary: `Fim do primeiro tempo! ${homeClub.shortName} ${homeGoals} × ${awayGoals} ${awayClub.shortName}`,
    importance: "medium",
  });

  // Substitutions
  const generateSubs = (players: Player[], team: "home" | "away", clubName: string) => {
    const numSubs = rand(1, 3);
    const available = [...players];
    for (let s = 0; s < numSubs && available.length > 3; s++) {
      const subMinute = rand(55, 85);
      // E5: Smart Substitutions - favor subbing out players with low fitness
      const fieldPlayers = available.filter(p => p.position !== "GK");
      if (fieldPlayers.length === 0) continue;
      
      fieldPlayers.sort((a, b) => {
        const scoreA = a.fitness - rand(0, 20);
        const scoreB = b.fitness - rand(0, 20);
        return scoreA - scoreB;
      });
      
      const playerOut = fieldPlayers[0];
      const idx = available.indexOf(playerOut);
      if (idx > -1) available.splice(idx, 1);
      
      const playerIn = available.length > 0 ? pick(available) : playerOut;

      events.push({
        minute: subMinute, type: "substitution", team,
        playerName: playerOut.name,
        assistName: playerIn.name,
        description: `🔄 Sai ${playerOut.name}, entra ${playerIn.name}`,
        commentary: pick(SUBSTITUTION_COMMENTARY)(playerOut.name, playerIn.name, clubName),
        importance: "medium",
      });
    }
  };
  generateSubs(homePlayers, "home", homeClub.shortName);
  generateSubs(awayPlayers, "away", awayClub.shortName);

  // Injuries (rare)
  if (Math.random() < 0.15) {
    const injTeam = Math.random() < 0.5 ? "home" as const : "away" as const;
    const injPlayers = injTeam === "home" ? homePlayers : awayPlayers;
    const injClub = injTeam === "home" ? homeClub.shortName : awayClub.shortName;
    const injPlayer = pick(injPlayers.filter(p => p.position !== "GK"));
    if (injPlayer) {
      const injMinute = rand(20, 80);
      const injuryDays = rand(7, 42); // E3: 1 to 6 weeks
      events.push({
        minute: injMinute, type: "injury", team: injTeam,
        playerName: injPlayer.name,
        description: `🏥 ${injPlayer.name} se lesionou!`,
        commentary: pick(INJURY_COMMENTARY)(injPlayer.name),
        importance: "high",
        injuryDays, // Add injury severity
      });

      const replacement = pick(injPlayers.filter(p => p.id !== injPlayer.id && p.position !== "GK"));
      if (replacement) {
        events.push({
          minute: injMinute + 1, type: "substitution", team: injTeam,
          playerName: injPlayer.name,
          assistName: replacement.name,
          description: `🔄 Substituição forçada: ${replacement.name} entra`,
          commentary: `🔄 Substituição forçada no ${injClub}: ${injPlayer.name} sai lesionado, ${replacement.name} entra em seu lugar.`,
          importance: "medium",
        });
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

  return {
    homeClub, awayClub,
    homeGoals, awayGoals,
    events,
    homeRating: Math.round(homeStrength * 10) / 10,
    awayRating: Math.round(awayStrength * 10) / 10,
    possession: { home: homePossession, away: 100 - homePossession },
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: { home: homeSoT, away: awaySoT },
    fouls: { home: homeFouls, away: awayFouls },
    corners: { home: homeCorners, away: awayCorners },
    motm,
    fitnessImpact,
  };
}