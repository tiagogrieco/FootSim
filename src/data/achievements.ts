import type { Achievement, ManagerProfile } from "../types/meta";

export interface AchievementDef extends Achievement {
  check: (p: ManagerProfile) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── First steps ────────────────────────────────
  { id: "rookie", name: "Estreante", description: "Dirija sua 1ª partida", icon: "🎬", tier: "bronze", xp: 10, check: p => p.totalMatchesManaged >= 1 },
  { id: "first_blood", name: "Primeira Vitória", description: "Vença sua primeira partida", icon: "🎉", tier: "bronze", xp: 25, check: p => p.totalWins >= 1 },
  { id: "first_clean_sheet", name: "Tranca!", description: "Sua primeira partida sem sofrer gols", icon: "🛡️", tier: "bronze", xp: 20, check: p => p.totalCleanSheets >= 1 },
  { id: "first_goal", name: "Bola na Rede", description: "Marque seu primeiro gol", icon: "⚽", tier: "bronze", xp: 10, check: p => p.totalGoalsScored >= 1 },

  // ── Career milestones ──────────────────────────
  { id: "matches_25", name: "Quarto de Século", description: "25 partidas dirigidas", icon: "📅", tier: "bronze", xp: 40, check: p => p.totalMatchesManaged >= 25 },
  { id: "matches_100", name: "Maratonista", description: "100 partidas dirigidas", icon: "🏃", tier: "silver", xp: 120, check: p => p.totalMatchesManaged >= 100 },
  { id: "matches_500", name: "Eterno", description: "500 partidas dirigidas", icon: "♾️", tier: "gold", xp: 500, check: p => p.totalMatchesManaged >= 500 },

  // ── Wins ───────────────────────────────────────
  { id: "ten_wins", name: "Vitorioso", description: "10 vitórias na carreira", icon: "🥈", tier: "silver", xp: 75, check: p => p.totalWins >= 10 },
  { id: "fifty_wins", name: "Veterano", description: "50 vitórias na carreira", icon: "🥇", tier: "gold", xp: 200, check: p => p.totalWins >= 50 },
  { id: "century", name: "Centenário", description: "100 vitórias", icon: "💯", tier: "gold", xp: 400, check: p => p.totalWins >= 100 },
  { id: "legend", name: "Lenda", description: "500 vitórias na carreira", icon: "👑", tier: "platinum", xp: 1500, check: p => p.totalWins >= 500 },

  // ── Win streaks ────────────────────────────────
  { id: "streak_3", name: "Embalado", description: "3 vitórias seguidas", icon: "🔥", tier: "bronze", xp: 40, check: p => p.winStreak >= 3 },
  { id: "streak_5", name: "Fase Quente", description: "5 vitórias seguidas", icon: "🌋", tier: "silver", xp: 120, check: p => p.winStreak >= 5 },
  { id: "streak_10", name: "Inalcançável", description: "10 vitórias seguidas", icon: "⚡", tier: "gold", xp: 400, check: p => p.winStreak >= 10 },
  { id: "streak_15", name: "Imparável", description: "15 vitórias seguidas", icon: "💎", tier: "platinum", xp: 1200, check: p => p.winStreak >= 15 },

  // ── Unbeaten ───────────────────────────────────
  { id: "unbeaten_5", name: "Resiliente", description: "5 jogos sem perder", icon: "🛡️", tier: "bronze", xp: 40, check: p => p.unbeatenRun >= 5 },
  { id: "unbeaten_10", name: "Sólido", description: "10 jogos sem perder", icon: "🗿", tier: "silver", xp: 150, check: p => p.unbeatenRun >= 10 },
  { id: "unbeaten_20", name: "Muro", description: "20 jogos sem perder", icon: "🧱", tier: "gold", xp: 500, check: p => p.unbeatenRun >= 20 },
  { id: "unbeaten_40", name: "Invicto Histórico", description: "40 jogos sem perder", icon: "🏛️", tier: "platinum", xp: 1500, check: p => p.unbeatenRun >= 40 },

  // ── Clean sheets ───────────────────────────────
  { id: "wall_10", name: "Defesa de Ferro", description: "10 clean sheets", icon: "🛡️", tier: "silver", xp: 80, check: p => p.totalCleanSheets >= 10 },
  { id: "wall_50", name: "Inviolável", description: "50 clean sheets", icon: "🏰", tier: "gold", xp: 300, check: p => p.totalCleanSheets >= 50 },
  { id: "cs_streak_3", name: "Triplo Cadeado", description: "3 clean sheets seguidos", icon: "🔒", tier: "silver", xp: 100, check: p => p.cleanSheetStreak >= 3 },
  { id: "cs_streak_5", name: "Fortaleza", description: "5 clean sheets seguidos", icon: "🏯", tier: "gold", xp: 250, check: p => p.cleanSheetStreak >= 5 },

  // ── Goals ──────────────────────────────────────
  { id: "goals_10", name: "Artilharia", description: "10 gols marcados", icon: "🎯", tier: "bronze", xp: 25, check: p => p.totalGoalsScored >= 10 },
  { id: "goals_50", name: "Atacante Mortal", description: "50 gols marcados", icon: "💣", tier: "silver", xp: 100, check: p => p.totalGoalsScored >= 50 },
  { id: "goals_200", name: "Máquina de Gols", description: "200 gols marcados", icon: "🚀", tier: "gold", xp: 350, check: p => p.totalGoalsScored >= 200 },
  { id: "goals_1000", name: "Predador", description: "1000 gols marcados", icon: "🔥", tier: "platinum", xp: 1500, check: p => p.totalGoalsScored >= 1000 },

  // ── Hat-tricks ─────────────────────────────────
  { id: "hattrick_1", name: "Hat-trick!", description: "Um jogador marca 3 gols numa partida", icon: "🎩", tier: "silver", xp: 75, check: p => p.matchHatTricks >= 1 },
  { id: "hattrick_5", name: "Mestre dos Hat-tricks", description: "5 hat-tricks na carreira", icon: "🎭", tier: "gold", xp: 250, check: p => p.matchHatTricks >= 5 },
  { id: "hattrick_20", name: "Rei dos Hat-tricks", description: "20 hat-tricks na carreira", icon: "🪄", tier: "platinum", xp: 1000, check: p => p.matchHatTricks >= 20 },

  // ── Win margins ────────────────────────────────
  { id: "win_big_3", name: "Goleada", description: "Vença por 3+ de diferença", icon: "💥", tier: "bronze", xp: 30, check: p => p.biggestWinMargin >= 3 },
  { id: "win_big_5", name: "Atropelo", description: "Vença por 5+ de diferença", icon: "🚜", tier: "silver", xp: 100, check: p => p.biggestWinMargin >= 5 },
  { id: "win_big_7", name: "Massacre", description: "Vença por 7+ de diferença", icon: "☠️", tier: "gold", xp: 300, check: p => p.biggestWinMargin >= 7 },
  { id: "win_big_10", name: "Vexame Total", description: "Vença por 10+ de diferença", icon: "🌪️", tier: "platinum", xp: 1000, check: p => p.biggestWinMargin >= 10 },

  // ── League position ────────────────────────────
  { id: "top4", name: "G4", description: "Termine entre os 4 primeiros", icon: "🏅", tier: "silver", xp: 150, check: p => p.highestPosition > 0 && p.highestPosition <= 4 },
  { id: "podium", name: "Pódio", description: "Termine entre os 3 primeiros", icon: "🥉", tier: "gold", xp: 300, check: p => p.highestPosition > 0 && p.highestPosition <= 3 },
  { id: "vice", name: "Vice-Campeão", description: "Termine em 2º", icon: "🥈", tier: "gold", xp: 500, check: p => p.highestPosition === 2 },
  { id: "champion", name: "CAMPEÃO!", description: "Termine em 1º na liga", icon: "🏆", tier: "platinum", xp: 1500, check: p => p.highestPosition === 1 },

  // ── Trophies ───────────────────────────────────
  { id: "trophy_1", name: "Primeiro Troféu", description: "Conquiste 1 título", icon: "🏆", tier: "silver", xp: 200, check: p => p.trophiesWon >= 1 },
  { id: "trophy_5", name: "Coleção", description: "5 títulos conquistados", icon: "🏛️", tier: "gold", xp: 600, check: p => p.trophiesWon >= 5 },
  { id: "trophy_10", name: "Dinastia", description: "10 títulos conquistados", icon: "👑", tier: "platinum", xp: 1500, check: p => p.trophiesWon >= 10 },

  // ── Manager XP / Level ─────────────────────────
  { id: "lv_5", name: "Manager Sênior", description: "Alcance nível 5", icon: "🔰", tier: "bronze", xp: 0, check: p => p.level >= 5 },
  { id: "lv_10", name: "Manager Pro", description: "Alcance nível 10", icon: "🎖️", tier: "silver", xp: 0, check: p => p.level >= 10 },
  { id: "lv_25", name: "Manager Elite", description: "Alcance nível 25", icon: "💠", tier: "gold", xp: 0, check: p => p.level >= 25 },
  { id: "lv_50", name: "Manager Imortal", description: "Alcance nível 50", icon: "🌟", tier: "platinum", xp: 0, check: p => p.level >= 50 },

  // ── Daily challenges ───────────────────────────
  { id: "ch_10", name: "Caçador de Desafios", description: "Complete 10 desafios diários", icon: "🎯", tier: "bronze", xp: 50, check: p => p.challengesCompleted >= 10 },
  { id: "ch_50", name: "Workaholic", description: "Complete 50 desafios diários", icon: "🏹", tier: "silver", xp: 200, check: p => p.challengesCompleted >= 50 },
  { id: "ch_200", name: "Lenda dos Desafios", description: "Complete 200 desafios diários", icon: "🗡️", tier: "gold", xp: 800, check: p => p.challengesCompleted >= 200 },
];
