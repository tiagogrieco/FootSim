import type { PressQuestion } from "../types/board";

export const PRESS_QUESTIONS: PressQuestion[] = [
  {
    id: "win_humble",
    context: "win",
    reporter: "Globo Esporte",
    question: "Vitória importante. A que você atribui esse resultado?",
    choices: [
      {
        id: "team",
        text: "Mérito total do elenco. Os jogadores foram brilhantes.",
        effects: { confidence: 2, morale: 6, fans: 3, media: "favorable" },
        responseHeadline: "Técnico exalta elenco após vitória",
      },
      {
        id: "self",
        text: "Foi a nossa preparação tática que fez a diferença.",
        effects: { confidence: 5, morale: -3, fans: 0, media: "neutral" },
        responseHeadline: "Técnico assume protagonismo da vitória",
      },
      {
        id: "humble",
        text: "Vencemos, mas há muito a melhorar. Não posso comemorar ainda.",
        effects: { confidence: 3, morale: 2, fans: 1, media: "favorable" },
        responseHeadline: "Treinador pede pés no chão",
      },
    ],
  },
  {
    id: "thrashing_win",
    context: "thrashing_win",
    reporter: "ESPN",
    question: "Goleada histórica! Vocês são candidatos ao título?",
    choices: [
      {
        id: "yes",
        text: "Sim! Vamos brigar pelo título até o fim.",
        effects: { confidence: 8, morale: 5, fans: 8, media: "favorable" },
        responseHeadline: "Treinador crava: 'Brigaremos pelo título!'",
      },
      {
        id: "calm",
        text: "Foi só uma partida. Vamos focar no próximo jogo.",
        effects: { confidence: 4, morale: 3, fans: 1, media: "neutral" },
        responseHeadline: "Treinador adota cautela após goleada",
      },
      {
        id: "deflect",
        text: "Pergunte à diretoria, eu só faço meu trabalho.",
        effects: { confidence: -3, morale: -2, fans: -3, media: "hostile" },
        responseHeadline: "Treinador esquiva-se de pergunta sobre título",
      },
    ],
  },
  {
    id: "loss_blame",
    context: "loss",
    reporter: "Jornalista crítico",
    question: "Derrota dolorosa. De quem é a culpa?",
    choices: [
      {
        id: "me",
        text: "A responsabilidade é minha. Falhei na preparação.",
        effects: { confidence: -2, morale: 8, fans: 4, media: "favorable" },
        responseHeadline: "Técnico assume culpa pela derrota",
      },
      {
        id: "players",
        text: "Os jogadores não executaram o plano de jogo.",
        effects: { confidence: 1, morale: -10, fans: -2, media: "hostile" },
        responseHeadline: "Técnico responsabiliza jogadores",
      },
      {
        id: "referee",
        text: "A arbitragem foi vergonhosa. Roubaram a gente.",
        effects: { confidence: -4, morale: 3, fans: 6, media: "hostile" },
        responseHeadline: "Treinador acusa arbitragem",
      },
      {
        id: "circumstances",
        text: "Lesões e desfalques pesaram. Faremos melhor.",
        effects: { confidence: 0, morale: 2, fans: 1, media: "neutral" },
        responseHeadline: "Treinador cita desfalques em derrota",
      },
    ],
  },
  {
    id: "thrashing_loss",
    context: "thrashing_loss",
    reporter: "Imprensa hostil",
    question: "Vexame. Você pediu demissão à diretoria?",
    choices: [
      {
        id: "fight",
        text: "Estou aqui para virar a página. Não desisto.",
        effects: { confidence: 3, morale: 5, fans: 4, media: "favorable" },
        responseHeadline: "Técnico promete reação após vexame",
      },
      {
        id: "deflect",
        text: "Não vou responder isso. Próxima pergunta.",
        effects: { confidence: -6, morale: -2, fans: -5, media: "hostile" },
        responseHeadline: "Treinador foge de pergunta após vexame",
      },
      {
        id: "challenge",
        text: "A diretoria me apoia. Quem manda no clube não é a imprensa.",
        effects: { confidence: 4, morale: 3, fans: 2, media: "hostile" },
        responseHeadline: "Treinador rebate imprensa em coletiva tensa",
      },
    ],
  },
  {
    id: "derby_win",
    context: "derby_win",
    reporter: "Torcedor com microfone",
    question: "VENCEMOS O CLÁSSICO! Manda um recado para o rival!",
    choices: [
      {
        id: "respect",
        text: "Foi uma partida difícil. Respeito ao adversário.",
        effects: { confidence: 3, morale: 4, fans: 2, media: "favorable" },
        responseHeadline: "Treinador respeita rival após clássico",
      },
      {
        id: "provoke",
        text: "Eles que se cuidem! A taça é nossa este ano!",
        effects: { confidence: 2, morale: 8, fans: 12, media: "neutral" },
        responseHeadline: "Treinador alfineta rival após clássico",
      },
      {
        id: "torcida",
        text: "Essa vitória é da nossa torcida! Vocês são gigantes!",
        effects: { confidence: 5, morale: 6, fans: 15, media: "favorable" },
        responseHeadline: "Treinador dedica vitória à torcida",
      },
    ],
  },
  {
    id: "derby_loss",
    context: "derby_loss",
    reporter: "Torcida revoltada",
    question: "Perdemos o clássico. O que você diz à torcida?",
    choices: [
      {
        id: "apologize",
        text: "Peço desculpas. Vamos reverter isso, eu prometo.",
        effects: { confidence: 0, morale: 4, fans: 6, media: "favorable" },
        responseHeadline: "Treinador pede desculpas à torcida",
      },
      {
        id: "promise",
        text: "Vamos vencer o próximo. Acreditem na gente.",
        effects: { confidence: 1, morale: 3, fans: 2, media: "neutral" },
        responseHeadline: "Treinador promete reação no próximo clássico",
      },
      {
        id: "silent",
        text: "Sem comentários. O jogo falou por si.",
        effects: { confidence: -3, morale: -3, fans: -8, media: "hostile" },
        responseHeadline: "Treinador silencia após derrota em clássico",
      },
    ],
  },
];

export function pickPressQuestion(
  context: PressQuestion["context"],
  rng = Math.random,
): PressQuestion | null {
  const pool = PRESS_QUESTIONS.filter(q => q.context === context);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}
