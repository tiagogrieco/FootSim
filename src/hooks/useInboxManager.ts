import { useState, useCallback } from "react";
import type { Player, InboxMessage, GameEvent, BoardObjective } from "../types/game";
import type { StaffMember } from "../types/staff";
import type { SaveData } from "../engine/saveEngine";
import { getRandomEvent } from "../engine/eventPool";
// Deferred email generation is handled by GameContext to avoid circular deps

interface GameNotification {
  type: "match" | "offer" | "season_end" | "none" | "event";
  message: string;
  date: string;
}

export function useInboxManager() {
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [lastNotification, setLastNotification] = useState<GameNotification>({ type: "none", message: "", date: "" });
  const [pendingEvent, setPendingEvent] = useState<GameEvent | null>(null);

  const clearNotification = useCallback(() => {
    setLastNotification({ type: "none", message: "", date: "" });
  }, []);

  const addInboxMessage = useCallback((
    sender: string,
    subject: string,
    body: string,
    type: InboxMessage["type"],
    date: string,
    options?: InboxMessage["actionOptions"]
  ) => {
    const newMessage: InboxMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender,
      subject,
      body,
      date,
      type,
      read: false,
      actionRequired: !!options && options.length > 0,
      actionCompleted: false,
      actionOptions: options
    };
    setInbox(prev => [newMessage, ...prev]);
    return newMessage;
  }, []);

  const markMessageRead = useCallback((messageId: string) => {
    setInbox(prev => prev.map(msg => msg.id === messageId ? { ...msg, read: true } : msg));
  }, []);

  const replyToMessage = useCallback((
    messageId: string,
    optionId: string,
    context: {
      playerSquad: Player[];
      staff: StaffMember[];
      budget: number;
      playerClubId: number;
      setPlayerSquad: (squad: Player[]) => void;
      setAllSquads: (updater: (prev: Map<number, Player[]>) => Map<number, Player[]>) => void;
      setBudget: (updater: (prev: number) => number) => void;
      setStaff: (staff: StaffMember[]) => void;
      setActiveBoardObjective: (obj: BoardObjective | null) => void;
      adjustBoardConfidence: (delta: number, reason: string) => void;
    }
  ) => {
    setInbox(prevInbox => {
      let updatedSquad: Player[] | null = null;
      let newBudgetEffect = 0;
      let staffChanges: StaffMember[] | null = null;
      let objectiveChange: BoardObjective | null | undefined = undefined;

      const nextInbox = prevInbox.map(msg => {
        if (msg.id !== messageId) return msg;

        const option = msg.actionOptions?.find(opt => opt.id === optionId);
        if (!option) return msg;

        const effects = option.effects;
        if (effects.budgetChange) {
          newBudgetEffect = effects.budgetChange;
        }
        if (effects.boardConfidenceChange) {
          context.adjustBoardConfidence(effects.boardConfidenceChange, `Correio: ${msg.subject}`);
        }

        const hasMoraleChange = !!effects.playerMoraleChange;
        const hasHappinessChange = !!effects.playerHappinessChange;
        const hasPlaytimePromise = !!effects.playtimePromise;
        const hasWageIncrease = !!effects.wageIncrease;
        const hasStrikeDays = !!effects.strikeDays;

        if (hasMoraleChange || hasHappinessChange || hasPlaytimePromise || hasWageIncrease || hasStrikeDays) {
          updatedSquad = context.playerSquad.map(p => {
            let pMorale = p.morale ?? 50;
            let happiness = p.happiness ?? 50;
            let promiseMatches = p.playtimePromiseMatches;
            let promiseStarts = p.playtimePromiseStarts;
            let wage = p.wage;
            let strikeDaysVal = p.strikeDays;

            if (effects.playerMoraleChange && effects.playerMoraleChange.playerId === p.id) {
              pMorale = Math.max(0, Math.min(100, pMorale + effects.playerMoraleChange.change));
            }
            if (effects.playerHappinessChange && effects.playerHappinessChange.playerId === p.id) {
              happiness = Math.max(0, Math.min(100, happiness + effects.playerHappinessChange.change));
            }
            if (effects.playtimePromise && (effects.playtimePromise as { playerId: number }).playerId === p.id) {
              promiseMatches = effects.playtimePromise.matches;
              promiseStarts = 0;
            }
            if (effects.wageIncrease && effects.wageIncrease.playerId === p.id) {
              wage = effects.wageIncrease.newWage;
            }
            if (effects.strikeDays && effects.strikeDays.playerId === p.id) {
              strikeDaysVal = effects.strikeDays.days;
            }

            return { ...p, morale: pMorale, happiness, playtimePromiseMatches: promiseMatches, playtimePromiseStarts: promiseStarts, wage, strikeDays: strikeDaysVal };
          });
        }
        if (effects.activeObjective) {
          objectiveChange = effects.activeObjective;
        }

        const hasStaffSatisfaction = !!effects.staffSatisfactionChange;
        const hasStaffQuality = !!effects.staffQualityChange;
        if (hasStaffSatisfaction || hasStaffQuality) {
          staffChanges = context.staff.map(s => {
            let satisfaction = s.satisfaction ?? 75;
            let quality = s.quality;
            if (effects.staffSatisfactionChange && effects.staffSatisfactionChange.role === s.role) {
              satisfaction = Math.max(0, Math.min(100, satisfaction + effects.staffSatisfactionChange.change));
            }
            if (effects.staffQualityChange && effects.staffQualityChange.role === s.role) {
              quality = Math.max(1, Math.min(100, quality + effects.staffQualityChange.change));
            }
            return { ...s, satisfaction, quality };
          });
        }

        const updatedBody = msg.body + `\n\n--- Resposta Enviada ---\nVocê escolheu: "${option.replyText}"`;

        return {
          ...msg,
          body: updatedBody,
          actionRequired: false,
          actionCompleted: true,
          read: true
        };
      });

      if (newBudgetEffect !== 0) {
        context.setBudget(prevBudget => prevBudget + newBudgetEffect);
      }
      if (updatedSquad) {
        context.setPlayerSquad(updatedSquad);
        const squadCopy = updatedSquad as Player[];
        context.setAllSquads(prev => {
          const next = new Map(prev);
          next.set(context.playerClubId, squadCopy);
          return next;
        });
      }
      if (staffChanges) {
        context.setStaff(staffChanges);
      }
      if (objectiveChange !== undefined) {
        context.setActiveBoardObjective(objectiveChange);
      }

      return nextInbox;
    });
  }, []);

  const advanceDay = useCallback((
    dateStr: string,
    pSquad: Player[],
    staff: StaffMember[],
    stopReason: "none" | "match" | "offer" | "event",
    currentInbox: InboxMessage[]
  ) => {
    const newInboxMessages: InboxMessage[] = [];
    let newStopReason = stopReason;
    let newStopDetail = "";
    let pendingDrama: { target: Player; dateStr: string } | null = null;

    // Player Complaint (Drama) Check & Wage Demands
    if (newStopReason === "none") {
      const veryUnhappyPlayers = pSquad.filter(p => (p.happiness ?? 50) < 30 && !currentInbox.some(m => m.sender === p.name) && !newInboxMessages.some(m => m.sender === p.name));
      const unhappyPlayers = pSquad.filter(p => (p.happiness ?? 50) < 50 && !currentInbox.some(m => m.sender === p.name) && !newInboxMessages.some(m => m.sender === p.name));

      const shouldTriggerDrama = veryUnhappyPlayers.length > 0 ? (Math.random() < 0.10) : (unhappyPlayers.length > 0 && Math.random() < 0.02);

      if (shouldTriggerDrama) {
        const target = veryUnhappyPlayers.length > 0
          ? veryUnhappyPlayers[Math.floor(Math.random() * veryUnhappyPlayers.length)]
          : unhappyPlayers[Math.floor(Math.random() * unhappyPlayers.length)];

        pendingDrama = { target, dateStr };
        newStopReason = "offer";
        newStopDetail = `📧 Reclamação: ${target.name}`;
      } else {
        const highPerformers = pSquad.filter(p =>
          p.seasonStats &&
          p.seasonStats.appearances >= 3 &&
          p.seasonStats.avgRating > 7.3 &&
          p.wage < Math.round(p.currentAbility * 800) &&
          !currentInbox.some(m => m.sender === `${p.name} (Empresário)`) &&
          !newInboxMessages.some(m => m.sender === `${p.name} (Empresário)`)
        );

        if (highPerformers.length > 0 && Math.random() < 0.05) {
          const target = highPerformers[Math.floor(Math.random() * highPerformers.length)];
          const proposedWage = Math.round(target.wage * 1.5);
          const agentName = `Empresário de ${target.name}`;

          const actionOptions = [
            {
              id: "option_1",
              text: `Aprovar aumento para R$ ${proposedWage.toLocaleString('pt-BR')}/mês`,
              replyText: `Aprovado. O novo contrato de ${target.name} foi assinado com valorização salarial.`,
              effects: {
                wageIncrease: { newWage: proposedWage, playerId: target.id },
                playerMoraleChange: { playerId: target.id, change: 15 },
                playerHappinessChange: { playerId: target.id, change: 20 }
              }
            },
            {
              id: "option_2",
              text: "Negar aumento salarial",
              replyText: `Negado. Comunicamos ao empresário que não temos margem para aumento salarial agora.`,
              effects: {
                playerMoraleChange: { playerId: target.id, change: -20 },
                playerHappinessChange: { playerId: target.id, change: -25 },
                strikeDays: { days: 7, playerId: target.id }
              }
            }
          ];

          const wageMsg: InboxMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: agentName,
            subject: `Solicitação urgente de valorização salarial - ${target.name}`,
            body: `Prezada diretoria e comissão técnica,\n\nComo representante do atleta ${target.name}, gostaria de ressaltar a excelente fase que meu cliente atravessa (Média de Nota: ${target.seasonStats.avgRating}). O salário atual de R$ ${target.wage.toLocaleString('pt-BR')}/mês está muito abaixo de sua contribuição técnica.\n\nSolicitamos uma revisão imediata para R$ ${proposedWage.toLocaleString('pt-BR')}/mês. Caso contrário, o atleta se sentirá desvalorizado, o que pode impactar sua dedicação aos treinos e jogos.\n\nAtenciosamente,\nAgenciamento de Carreiras ProFootball`,
            date: dateStr,
            type: "player",
            read: false,
            actionRequired: true,
            actionCompleted: false,
            actionOptions
          };
          newInboxMessages.push(wageMsg);
          newStopReason = "offer";
          newStopDetail = `📧 Demanda Salarial: ${target.name}`;
        }
      }
    }

    // Coaching Staff Demands
    if (newStopReason === "none" && staff && staff.length > 0 && Math.random() < 0.015) {
      const member = staff[Math.floor(Math.random() * staff.length)];
      const rolesMapping: Record<string, { label: string; cost: number; equipment: string }> = {
        physio: { label: "Fisioterapeuta", cost: 30000, equipment: "novos aparelhos de ultrassom e macas de massagem" },
        fitnessCoach: { label: "Preparador Físico", cost: 25000, equipment: "coletes de rastreamento GPS e novos halteres" },
        gkCoach: { label: "Treinador de Goleiros", cost: 15000, equipment: "barreiras móveis e luzes de reação reflexa" },
        scout: { label: "Olheiro", cost: 20000, equipment: "assinatura anual de banco de dados de atletas" },
        headCoach: { label: "Auxiliar Técnico", cost: 35000, equipment: "software profissional de análise tática e notebook" }
      };
      const config = rolesMapping[member.role] || { label: "Comissão Técnica", cost: 20000, equipment: "novos equipamentos esportivos" };

      const actionOptions = [
        {
          id: "accept_staff_demand",
          text: `Investir R$ ${config.cost.toLocaleString('pt-BR')} em melhorias`,
          replyText: `Investimento autorizado! O departamento de ${config.label.toLowerCase()} foi modernizado com ${config.equipment}.`,
          effects: {
            budgetChange: -config.cost,
            staffSatisfactionChange: { role: member.role, change: 15 },
            staffQualityChange: { role: member.role, change: 3 }
          }
        },
        {
          id: "refuse_staff_demand",
          text: "Recusar investimento (reduz satisfação do profissional)",
          replyText: `Investimento recusado. Explicamos que o orçamento do clube está apertado no momento.`,
          effects: {
            staffSatisfactionChange: { role: member.role, change: -20 }
          }
        }
      ];

      const staffMsg: InboxMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: `${member.name} (${config.label})`,
        subject: `Necessidade de investimento: ${config.label}`,
        body: `Olá Professor,\n\nEscrevo para solicitar verba para o nosso departamento de ${config.label.toLowerCase()}. Atualmente, estamos defasados e necessitamos adquirir ${config.equipment}.\n\nEsse investimento de R$ ${config.cost.toLocaleString('pt-BR')} trará um ganho significativo de qualidade no dia a dia do clube.\n\nConto com seu apoio,\n${member.name}`,
        date: dateStr,
        type: "board",
        read: false,
        actionRequired: true,
        actionCompleted: false,
        actionOptions
      };
      newInboxMessages.push(staffMsg);
      newStopReason = "offer";
      newStopDetail = `📧 Comissão: ${member.name}`;
    }

    // Random Events
    if (newStopReason === "none" && Math.random() < 0.025) {
      const rawEvent = getRandomEvent();
      const starPlayer = [...pSquad].sort((a, b) => b.currentAbility - a.currentAbility)[0];
      const randomPlayer = pSquad[Math.floor(Math.random() * pSquad.length)];

      if (starPlayer) {
        rawEvent.description = rawEvent.description.replace("Sua principal estrela", `Sua principal estrela (${starPlayer.name})`);
      }
      if (randomPlayer) {
        rawEvent.description = rawEvent.description.replace("um de seus jogadores", `${randomPlayer.name}`);
      }

      setPendingEvent(rawEvent);
      newStopReason = "event";
      newStopDetail = `Acontecimento: ${rawEvent.title}`;
    }

    return {
      newInboxMessages,
      stopReason: newStopReason,
      stopDetail: newStopDetail,
      pendingDrama,
    };
  }, []);

  const applyLoadedState = useCallback((data: SaveData) => {
    setInbox(data.inbox || []);
    setPendingEvent(data.pendingEvent || null);
  }, []);

  const setNotification = useCallback((type: GameNotification["type"], message: string, date: string) => {
    setLastNotification({ type, message, date });
  }, []);

  return {
    inbox,
    setInbox,
    lastNotification,
    setLastNotification,
    pendingEvent,
    setPendingEvent,
    clearNotification,
    addInboxMessage,
    markMessageRead,
    replyToMessage,
    advanceDay,
    applyLoadedState,
    setNotification,
  };
}
