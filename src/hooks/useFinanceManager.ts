import { useState, useCallback } from "react";
import type { Player, Club } from "../types/game";
import type { FinancialRecord } from "../engine/financeEngine";
import {
  calculateMatchDayRevenue,
  calculateSponsorRevenue,
  calculateMonthlyExpenses,
  formatCurrency,
} from "../engine/financeEngine";
import type { SaveData } from "../engine/saveEngine";
import type { InboxMessage } from "../types/game";

export function useFinanceManager() {
  const [budget, setBudget] = useState(0);
  const [financialLedger, setFinancialLedger] = useState<FinancialRecord[]>([]);
  const [debt, setDebt] = useState<number>(0);

  const startNewGame = useCallback((initialClub: Club, roadToGlory?: boolean) => {
    const initialBudget = roadToGlory ? 50000 : initialClub.budget;
    setBudget(initialBudget);
    setDebt(0);
    setFinancialLedger([]);
    return initialBudget;
  }, []);

  const advanceDay = useCallback((
    currentSquads: Map<number, Player[]>,
    playerClubId: number,
    currentBudget: number
  ) => {
    const pSquad = currentSquads.get(playerClubId) || [];
    const newBudget = currentBudget - Math.round(pSquad.reduce((s, p) => s + p.wage, 0) / 30);
    return newBudget;
  }, []);

  const simulatePlayerMatch = useCallback((
    playerClub: Club,
    isHome: boolean,
    currentBudget: number,
    currentDate: string,
    season: number
  ) => {
    const revenue = calculateMatchDayRevenue(playerClub, isHome);
    if (revenue > 0) {
      const newBudget = currentBudget + revenue;
      const entry: FinancialRecord = {
        month: new Date(currentDate).getMonth() + 1,
        season,
        type: "income" as const,
        category: "ticket" as const,
        description: `Bilheteria — ${isHome ? "Casa" : "Fora"}`,
        amount: revenue,
      };
      return { newBudget, entry };
    }
    return { newBudget: currentBudget, entry: null };
  }, []);

  const advanceMonth = useCallback((
    playerClub: Club,
    currentBudget: number,
    currentDate: string,
    season: number,
    currentDebt: number
  ) => {
    const sponsorRev = calculateSponsorRevenue(playerClub);
    const monthlyExpenses = calculateMonthlyExpenses(playerClub);
    const taxExpenses = 20000;

    let repayment = 0;
    let interest = 0;
    if (currentDebt > 0) {
      repayment = Math.min(currentDebt, 10000);
      interest = Math.round(currentDebt * 0.015);
    }

    const totalExpenses = monthlyExpenses + taxExpenses + repayment + interest;
    const netMonth = sponsorRev - totalExpenses;
    let nextBudget = currentBudget + netMonth;

    let newLoans = 0;
    while (nextBudget < 0) {
      nextBudget += 100000;
      newLoans += 100000;
    }

    const entries: FinancialRecord[] = [
      {
        month: new Date(currentDate).getMonth() + 1,
        season,
        type: "income" as const,
        category: "sponsor" as const,
        description: playerClub.sponsor ? `Patrocínio ${playerClub.sponsor.name}` : "Receita mensal",
        amount: sponsorRev,
      },
      {
        month: new Date(currentDate).getMonth() + 1,
        season,
        type: "expense" as const,
        category: "facility" as const,
        description: "Despesas Mensais (Comissão e Manutenção)",
        amount: monthlyExpenses,
      },
      {
        month: new Date(currentDate).getMonth() + 1,
        season,
        type: "expense" as const,
        category: "facility" as const,
        description: "Impostos e Taxas Operacionais",
        amount: taxExpenses,
      }
    ];

    if (repayment > 0) {
      entries.push({
        month: new Date(currentDate).getMonth() + 1,
        season,
        type: "expense" as const,
        category: "facility" as const,
        description: "Amortização de Empréstimo",
        amount: repayment,
      });
    }
    if (interest > 0) {
      entries.push({
        month: new Date(currentDate).getMonth() + 1,
        season,
        type: "expense" as const,
        category: "facility" as const,
        description: "Juros de Empréstimo (1.5%)",
        amount: interest,
      });
    }
    if (newLoans > 0) {
      entries.push({
        month: new Date(currentDate).getMonth() + 1,
        season,
        type: "income" as const,
        category: "facility" as const,
        description: "Empréstimo Emergencial Contraído",
        amount: newLoans,
      });
    }

    let nextDebt = currentDebt;
    if (currentDebt > 0) {
      nextDebt = Math.max(0, currentDebt - repayment + newLoans);
    } else if (newLoans > 0) {
      nextDebt = newLoans;
    }

    let loanMessage: InboxMessage | null = null;
    if (newLoans > 0) {
      loanMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: "Diretoria (Financeiro)",
        subject: "⚠️ Empréstimo Emergencial Contraído",
        body: `Prezado treinador,\n\nDevido a um saldo de caixa negativo na virada do mês, contraímos um empréstimo bancário automático de ${formatCurrency(newLoans)} para cobrir o fluxo de caixa.\n\nEste empréstimo possui amortização mensal de R$ 10.000 + 1.5% de juros sobre o saldo devedor restante.\n\nPor favor, planeje melhor nossos gastos.\n\nAtenciosamente,\nDepartamento Financeiro do ${playerClub.name}`,
        date: currentDate,
        type: "board",
        read: false,
      };
    }

    return {
      nextBudget,
      nextDebt,
      entries,
      loanMessage,
      newLoans,
    };
  }, []);

  const addLedgerEntry = useCallback((entry: FinancialRecord) => {
    setFinancialLedger(prev => [...prev, entry]);
  }, []);

  const payOffDebt = useCallback((amount: number, currentBudget: number, currentDebt: number, currentDate: string, season: number) => {
    if (amount <= 0 || currentBudget < amount || currentDebt < amount) return { success: false };
    setBudget(b => b - amount);
    setDebt(d => d - amount);
    setFinancialLedger(prev => [...prev, {
      month: new Date(currentDate).getMonth() + 1,
      season,
      type: "expense" as const,
      category: "loan" as const,
      description: `Amortização Voluntária de Dívida`,
      amount,
    }]);
    return { success: true };
  }, []);

  const applyLoadedState = useCallback((data: SaveData) => {
    setBudget(data.budget);
    setFinancialLedger(data.financialLedger || []);
    setDebt(data.debt ?? 0);
  }, []);

  return {
    budget,
    setBudget,
    financialLedger,
    setFinancialLedger,
    debt,
    setDebt,
    startNewGame,
    advanceDay,
    simulatePlayerMatch,
    advanceMonth,
    addLedgerEntry,
    payOffDebt,
    applyLoadedState,
  };
}
