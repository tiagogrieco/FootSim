import { useState, useCallback } from "react";
import type { Player, Club, PlayerAttributes } from "../types/game";
import { calculateCA, createEmptyStats } from "../types/game";
import type { StaffMember } from "../types/staff";
import { generateStaffPool } from "../types/staff";
import type { Injury, TrainingFocus, TrainingReport } from "../engine/trainingEngine";
import { developPlayers, generateTrainingReport } from "../engine/trainingEngine";
import { getRecoveryBonus } from "../engine/staffEngine";
import type { SaveData } from "../engine/saveEngine";
import { ageAllPlayers, retirePlayers } from "../engine/seasonEngine";
import { generateYouthPlayers } from "../engine/playerGenerator";
import { slimDownSquad } from "../engine/slimDownSquad";
import { generateSquadForClub } from "../engine/playerGenerator";
import rawPlayers from "../data/players.json";
import allSquadsData from "../data/all_squads.json";
import clubsData from "../data/clubs.json";

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateContractExpiry(years: number): string {
  const now = new Date();
  now.setFullYear(now.getFullYear() + years);
  now.setMonth(rand(0, 11));
  now.setDate(rand(1, 28));
  return now.toISOString().split("T")[0];
}

export function useSquadManager() {
  const [allSquads, setAllSquads] = useState<Map<number, Player[]>>(new Map());
  const [playerSquad, setPlayerSquad] = useState<Player[]>([]);
  const [trainingFocus, setTrainingFocusState] = useState<TrainingFocus>({ type: "team" });
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffPool, setStaffPool] = useState<StaffMember[]>(generateStaffPool());
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [lastTrainingReport, setLastTrainingReport] = useState<TrainingReport | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<TrainingReport[]>([]);

  const startNewGame = useCallback((
    freshClubs: Club[],
    initialClub: Club,
    roadToGlory?: boolean,
    _difficulty?: "easy" | "medium" | "hard",
    customClubConfig?: { name: string; shortName: string; colors: { primary: string; secondary: string } }
  ) => {
    const modData = localStorage.getItem("footsim_custom_data");
    let initialPlayers = rawPlayers as Player[];

    if (modData) {
      try {
        const parsedMod = JSON.parse(modData);
        if (parsedMod.players && Array.isArray(parsedMod.players)) {
          initialPlayers = parsedMod.players;
        }
      } catch (e) {
        console.error("Failed to load mod data, falling back to default.", e);
      }
    }

    const squads = new Map<number, Player[]>();
    const realSquads = allSquadsData as Record<string, unknown[]>;

    for (const club of freshClubs) {
      const clubId = club.id;
      let squadForClub: Player[];

      if (club.id === (clubsData as Club[])[0].id && !customClubConfig) {
        squadForClub = initialPlayers.map(p => ({
          ...p,
          currentAbility: calculateCA(p.attributes, p.positionCategory),
          seasonStats: p.seasonStats || createEmptyStats(),
          form: p.form ?? 50,
          happiness: p.happiness ?? 50,
          contractYears: p.contractYears ?? rand(1, 4),
          contractExpiry: p.contractExpiry ?? generateContractExpiry(rand(1, 4)),
        }));
      } else {
        const realSquad = realSquads[String(clubId)] as Player[] | undefined;
        if (realSquad && realSquad.length > 0 && !modData && (!customClubConfig || clubId !== 20)) {
          squadForClub = realSquad.map(p => ({
            ...p,
            currentAbility: calculateCA(p.attributes, p.positionCategory),
            seasonStats: p.seasonStats || createEmptyStats(),
            form: p.form ?? 50,
            happiness: p.happiness ?? 50,
            contractYears: p.contractYears ?? rand(1, 4),
            contractExpiry: p.contractExpiry ?? generateContractExpiry(rand(1, 4)),
          }));
        } else {
          squadForClub = generateSquadForClub(club);
        }
      }
      squads.set(clubId, squadForClub);
    }

    for (const [clubId, squad] of squads) {
      squads.set(clubId, slimDownSquad(squad));
    }

    const playerStartingSquad = squads.get(initialClub.id)!;

    if (roadToGlory) {
      playerStartingSquad.forEach(player => {
        const keys = Object.keys(player.attributes) as Array<keyof PlayerAttributes>;
        keys.forEach(k => {
          player.attributes[k] = Math.max(30, Math.round(player.attributes[k] * 0.75));
        });
        player.currentAbility = calculateCA(player.attributes, player.positionCategory);
        player.potentialAbility = Math.max(player.currentAbility, Math.round(player.potentialAbility * 0.85));
        player.marketValue = Math.round(player.marketValue * 0.3);
        player.wage = Math.round(player.wage * 0.4);
      });
    }

    setAllSquads(squads);
    setPlayerSquad(playerStartingSquad);
    setTrainingFocusState({ type: "team" });
    setStaff([]);
    setStaffPool(generateStaffPool());
    setInjuries([]);
    setLastTrainingReport(null);
    setTrainingHistory([]);

    return { squads, playerStartingSquad };
  }, []);

  const applyDailyRecovery = useCallback((squads: Map<number, Player[]>, playerClubId: number) => {
    const recoveryMult = 1 + getRecoveryBonus(staff);
    const newSquads = new Map<number, Player[]>(squads);
    for (const [clubId, squad] of newSquads) {
      newSquads.set(clubId, squad.map(p => {
        const isPlayerClub = clubId === playerClubId;
        const fitnessGain = isPlayerClub ? Math.round((2 + rand(2, 4)) * recoveryMult) : rand(2, 4);
        let morale = p.morale ?? 50;
        // Long injury recovery (>21 days): -10 morale when healed
        if (p.injuryDays === 1 && isPlayerClub) {
          // Approximate: if player was injured for a while, penalize
          // We track this via a flag or approximate by checking if fitness is very low
          if (p.fitness < 50) {
            morale = Math.max(0, morale - 10);
          }
        }
        return {
          ...p,
          fitness: Math.min(100, p.fitness + fitnessGain),
          injuryDays: (p.injuryDays && p.injuryDays > 1) ? p.injuryDays - 1 : undefined,
          suspensionDays: (p.suspensionDays && p.suspensionDays > 1) ? p.suspensionDays - 1 : undefined,
          strikeDays: (p.strikeDays && p.strikeDays > 1) ? p.strikeDays - 1 : undefined,
          morale,
        };
      }));
    }
    return newSquads;
  }, [staff]);

  const advanceDay = useCallback((currentSquads: Map<number, Player[]>, playerClubId: number) => {
    const newSquads = applyDailyRecovery(currentSquads, playerClubId);
    setAllSquads(newSquads);
    const updatedPlayerSquad = newSquads.get(playerClubId);
    if (updatedPlayerSquad) setPlayerSquad(updatedPlayerSquad);
    return newSquads;
  }, [applyDailyRecovery]);

  const applyMonthlyMorale = useCallback((currentSquads: Map<number, Player[]>, playerClubId: number) => {
    const newSquads = new Map<number, Player[]>(currentSquads);
    const squad = newSquads.get(playerClubId);
    if (!squad) return { squads: newSquads, messages: [] as import("../types/game").InboxMessage[] };
    
    const avgWage = squad.reduce((s, p) => s + p.wage, 0) / squad.length;
    const messages: import("../types/game").InboxMessage[] = [];
    
    newSquads.set(playerClubId, squad.map(p => {
      let morale = p.morale ?? 50;
      let happiness = p.happiness ?? 50;
      
      // Underpaid players lose morale
      if (p.wage < avgWage * 0.7) {
        morale = Math.max(0, morale - 5);
        happiness = Math.max(0, happiness - 3);
      }
      
      // High earners feel valued
      if (p.wage > avgWage * 1.5) {
        morale = Math.min(100, morale + 2);
      }
      
      return { ...p, morale, happiness };
    }));
    
    // Check for unhappy players wanting to leave
    const unhappyPlayers = squad.filter(p => (p.happiness ?? 50) < 20 && !p.playtimePromiseMatches);
    for (const p of unhappyPlayers) {
      messages.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: p.name,
        subject: "🚪 Quero sair do clube",
        body: `Treinador,\n\nNão estou satisfeito com a minha situação aqui. Preciso de mais oportunidades ou vou pedir para sair.\n\n${p.name}`,
        date: new Date().toISOString().split("T")[0],
        type: "player",
        read: false,
        actionRequired: true,
        actionOptions: [
          { id: "sell", text: "Vender jogador", replyText: "Vamos encontrar um clube para você.", effects: {} },
          { id: "promise", text: "Prometer 3 jogos titular", replyText: "Você será titular nos próximos 3 jogos.", effects: { playtimePromise: { matches: 3, playerId: p.id } } },
          { id: "reject", text: "Recusar pedido", replyText: "Você é importante para o elenco. Fique.", effects: { playerMoraleChange: { playerId: p.id, change: -30 } } },
        ],
      });
    }
    
    // Check for contracts expiring in < 6 months
    const now = new Date();
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const expiringPlayers = squad.filter(p => {
      if (!p.contractExpiry) return false;
      const expiry = new Date(p.contractExpiry);
      return expiry <= sixMonthsFromNow && expiry > now;
    });
    for (const p of expiringPlayers) {
      messages.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: "Departamento Jurídico",
        subject: `📄 Contrato de ${p.name} expirando`,
        body: `Treinador,\n\nO contrato de ${p.name} expira em ${p.contractExpiry}. Precisamos decidir:\n\n- Renovar (aumento salarial provável)\n- Vender antes de perder de graça\n- Deixar sair no fim do contrato\n\nDepartamento Jurídico`,
        date: new Date().toISOString().split("T")[0],
        type: "system",
        read: false,
        actionRequired: true,
        actionOptions: [
          { id: "renew", text: `Renovar contrato (+${Math.round(p.wage * 0.3)} salário)`, replyText: "Vamos renovar seu contrato.", effects: { wageIncrease: { newWage: Math.round(p.wage * 1.3), playerId: p.id } } },
          { id: "sell", text: "Colocar à venda", replyText: "Vamos negociar sua saída.", effects: { playerHappinessChange: { playerId: p.id, change: -10 } } },
          { id: "let_go", text: "Deixar sair de graça", replyText: "Seu contrato não será renovado.", effects: { playerHappinessChange: { playerId: p.id, change: -20 }, playerMoraleChange: { playerId: p.id, change: -15 } } },
        ],
      });
    }
    
    setAllSquads(newSquads);
    const updatedPlayerSquad = newSquads.get(playerClubId);
    if (updatedPlayerSquad) setPlayerSquad(updatedPlayerSquad);
    return { squads: newSquads, messages };
  }, []);

  const simulatePlayerMatch = useCallback((result: {
    allSquads: Map<number, Player[]>;
    playerMatch: import("../engine/matchEngine").MatchResult | null;
    isHome: boolean;
  }, playerClubId: number) => {
    const { allSquads: newSquads } = result;
    setAllSquads(newSquads);
    const updatedPlayerSquad = newSquads.get(playerClubId);
    if (updatedPlayerSquad) setPlayerSquad(updatedPlayerSquad);
    return newSquads;
  }, []);

  const setTrainingFocus = useCallback((focus: TrainingFocus) => {
    setTrainingFocusState(focus);
  }, []);

  const hireStaff = useCallback((id: number, currentBudget: number) => {
    const member = staffPool.find(s => s.id === id);
    if (!member || member.hired) return { success: false, cost: 0 };
    if (currentBudget < member.wage * 12) return { success: false, cost: 0 };
    setStaffPool(prev => prev.map(s => s.id === id ? { ...s, hired: true } : s));
    setStaff(prev => [...prev, { ...member, hired: true }]);
    const cost = member.wage * 6;
    return { success: true, cost, member };
  }, [staffPool]);

  const fireStaff = useCallback((id: number) => {
    const member = staff.find(s => s.id === id);
    if (!member) return { success: false, cost: 0 };
    setStaff(prev => prev.filter(s => s.id !== id));
    setStaffPool(prev => prev.map(s => s.id === id ? { ...s, hired: false } : s));
    const cost = member.wage * 3;
    return { success: true, cost, member };
  }, [staff]);

  const startNewSeason = useCallback((
    currentAllSquads: Map<number, Player[]>,
    currentClubs: Club[],
    currentSeason: number,
    playerClubId: number
  ) => {
    const newAllSquads = new Map<number, Player[]>();
    for (const [clubId, squad] of currentAllSquads) {
      const aged = ageAllPlayers(squad);
      const { remaining } = retirePlayers(aged);
      const clubInfo = currentClubs.find(c => c.id === clubId);
      const clubName = clubInfo?.name || "Unknown";
      const clubShort = clubInfo?.shortName || "???";

      let nextSquad = [...remaining];
      if (clubInfo) {
        const youthCount = Math.max(1, Math.min(3, Math.floor((clubInfo.infrastructure || 50) / 30) + 1));
        const youthPlayers = generateYouthPlayers(clubInfo, youthCount);
        nextSquad = [...remaining, ...youthPlayers];
      }

      const resetSquad = nextSquad.map(p => {
        const history = [...(p.careerHistory || [])];
        if (p.seasonStats && p.seasonStats.appearances > 0) {
          history.push({ season: currentSeason, clubName, clubShort, stats: { ...p.seasonStats } });
        }
        return { ...p, seasonStats: createEmptyStats(), careerHistory: history };
      });
      newAllSquads.set(clubId, resetSquad);
    }
    setAllSquads(newAllSquads);
    const ps = newAllSquads.get(playerClubId);
    if (ps) setPlayerSquad(ps);
    setInjuries([]);
    setLastTrainingReport(null);
    return newAllSquads;
  }, []);

  const advanceMonth = useCallback((
    currentAllSquads: Map<number, Player[]>,
    currentClubs: Club[],
    playerClubId: number,
    playerClub: Club,
    currentTrainingFocus: TrainingFocus,
    currentSeason: number,
    currentDate: string
  ) => {
    const newAllSquads = new Map<number, Player[]>();
    let report: TrainingReport | null = null;
    let newInjuriesList: Injury[] = [];

    for (const [clubId, squad] of currentAllSquads) {
      const club = currentClubs.find(c => c.id === clubId);
      const infra = club?.infrastructure || 50;
      const focus = clubId === playerClubId ? currentTrainingFocus : { type: "team" as const };
      const { developed, newInjuries } = developPlayers(squad, infra, focus, clubId === playerClubId ? staff : []);
      newAllSquads.set(clubId, developed);

      if (clubId === playerClubId) {
        setPlayerSquad(developed);
        const beforePlayerSquad = squad;
        const monthNum = new Date(currentDate).getMonth() + 1;
        report = generateTrainingReport(beforePlayerSquad, developed, currentTrainingFocus, playerClub.infrastructure, newInjuries, monthNum, currentSeason);
        setLastTrainingReport(report);
        setTrainingHistory(prev => [...prev.slice(-5), report].filter((r): r is import("../engine/trainingEngine").TrainingReport => r !== null));
        setInjuries(prev => {
          const healed = prev.filter(i => {
            const p = developed.find(pl => pl.id === i.playerId);
            return p && p.injuryDays && p.injuryDays > 0;
          }).map(i => ({ ...i, weeksRemaining: Math.max(0, i.weeksRemaining - 1) }));
          return [...healed, ...newInjuries];
        });
        newInjuriesList = newInjuries;
      }
    }
    setAllSquads(newAllSquads);
    return { newAllSquads, report, newInjuries: newInjuriesList };
  }, [staff]);

  const applyLoadedState = useCallback((data: SaveData) => {
    const migratedSquads = new Map((data.allSquadsEntries || []).map(([id, squad]) => [
      id,
      (squad || []).map(p => ({ ...p, seasonStats: p.seasonStats || createEmptyStats(), careerHistory: p.careerHistory || [] })),
    ] as [number, Player[]]));
    setAllSquads(migratedSquads);
    const migratedSquad = (data.playerSquad || []).map(p => ({ ...p, seasonStats: p.seasonStats || createEmptyStats(), careerHistory: p.careerHistory || [] }));
    setPlayerSquad(migratedSquad);
    setTrainingFocusState(data.trainingFocus);
    setStaffPool(data.staffPool || generateStaffPool());
    setStaff(data.staff || []);
    setInjuries(data.injuries || []);
    setLastTrainingReport(data.lastTrainingReport || null);
    setTrainingHistory(data.trainingHistory || []);
    return migratedSquads;
  }, []);

  return {
    allSquads,
    setAllSquads,
    playerSquad,
    setPlayerSquad,
    trainingFocus,
    setTrainingFocus,
    staff,
    setStaff,
    staffPool,
    setStaffPool,
    injuries,
    setInjuries,
    lastTrainingReport,
    trainingHistory,
    startNewGame,
    advanceDay,
    applyDailyRecovery,
    simulatePlayerMatch,
    hireStaff,
    fireStaff,
    startNewSeason,
    advanceMonth,
    applyMonthlyMorale,
    applyLoadedState,
    setTrainingHistory,
  };
}
