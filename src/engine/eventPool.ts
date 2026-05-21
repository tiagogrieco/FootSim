import type { GameEvent } from "../types/game";

export const EVENT_POOL: GameEvent[] = [
  {
    id: "star_complaint",
    title: "Estrela Inquieta",
    icon: "😠",
    description: "Sua principal estrela veio reclamar que o treinamento tático está excessivamente cansativo e desgastante, exigindo um treino personalizado mais leve.",
    options: [
      {
        text: "Ceder e poupá-lo",
        effectText: "Moral da estrela +20, Moral do restante do elenco -8",
        effects: {
          moraleChange: -8,
          playerMoralChange: { target: "star", value: 20 }
        }
      },
      {
        text: "Cobrar postura profissional",
        effectText: "Moral da estrela -15, Confiança da diretoria +5",
        effects: {
          boardConfidenceChange: 5,
          playerMoralChange: { target: "star", value: -15 }
        }
      }
    ]
  },
  {
    id: "press_conference",
    title: "Coletiva de Imprensa Quente",
    icon: "🎤",
    description: "Um jornalista pergunta de forma provocativa se o time tem qualidade real para brigar pelo título ou se a campanha é apenas sorte.",
    options: [
      {
        text: "Garantir que brigamos pela taça",
        effectText: "Moral Geral +10, Confiança da diretoria pressionada (-3)",
        effects: {
          moraleChange: 10,
          boardConfidenceChange: -3
        }
      },
      {
        text: "Pedir pés no chão",
        effectText: "Moral Geral -5, Confiança da diretoria +4",
        effects: {
          moraleChange: -5,
          boardConfidenceChange: 4
        }
      }
    ]
  },
  {
    id: "spot_sponsor",
    title: "Patrocínio Pontual",
    icon: "💰",
    description: "Uma cervejaria local ofereceu um patrocínio estampado nos calções por 2 partidas. A diretoria acha que isso desvaloriza a camisa clássica, mas o dinheiro é bom.",
    options: [
      {
        text: "Aceitar a verba",
        effectText: "Orçamento +R$ 150.000, Confiança da diretoria -5",
        effects: {
          budgetChange: 150000,
          boardConfidenceChange: -5
        }
      },
      {
        text: "Preservar a camisa",
        effectText: "Confiança da diretoria +8",
        effects: {
          boardConfidenceChange: 8
        }
      }
    ]
  },
  {
    id: "intense_training",
    title: "Treinamento Puxado",
    icon: "🏋️",
    description: "A comissão técnica sugere realizar um 'treino da morte' físico esta semana. Aumenta muito os atributos dos jogadores, mas o risco de lesão é elevado.",
    options: [
      {
        text: "Forçar intensidade máxima",
        effectText: "XP de todos os jogadores +30, Risco de lesão física",
        effects: {
          xpBoost: { target: "all", value: 30 },
          injuryPlayer: { probability: 0.35, maxDuration: 14 }
        }
      },
      {
        text: "Manter treino leve padrão",
        effectText: "XP de todos os jogadores +5, elenco descansado",
        effects: {
          xpBoost: { target: "all", value: 5 }
        }
      }
    ]
  },
  {
    id: "dressing_room_fight",
    title: "Clima Quente no Coletivo",
    icon: "🥊",
    description: "Durante o treino coletivo, dois jogadores dividiram forte e acabaram trocando empurrões no gramado diante do elenco.",
    options: [
      {
        text: "Multar e punir ambos",
        effectText: "Confiança da diretoria +5, Moral do vestiário -10",
        effects: {
          boardConfidenceChange: 5,
          moraleChange: -10
        }
      },
      {
        text: "Apaziguar e resolver no vestiário",
        effectText: "Moral Geral +5, Confiança da diretoria -5",
        effects: {
          moraleChange: 5,
          boardConfidenceChange: -5
        }
      }
    ]
  },
  {
    id: "extra_bonus_demand",
    title: "Cobrança de Bicho",
    icon: "💸",
    description: "Líderes do elenco bateram na sua porta pedindo uma premiação ('bicho') extra em dinheiro caso vençam a partida de domingo.",
    options: [
      {
        text: "Prometer bicho generoso",
        effectText: "Orçamento -R$ 75.000, Moral Geral +15",
        effects: {
          budgetChange: -75000,
          moraleChange: 15
        }
      },
      {
        text: "Salários já estão em dia",
        effectText: "Moral Geral -10, Orçamento intacto",
        effects: {
          moraleChange: -10
        }
      }
    ]
  },
  {
    id: "nightlife_rumor",
    title: "Flagra na Balada",
    icon: "🍺",
    description: "Vazaram fotos nas redes sociais de um de seus jogadores bebendo e curtindo pagode às 3h da manhã da última quarta-feira.",
    options: [
      {
        text: "Afastar e multar o jogador",
        effectText: "Moral Geral +5, Moral do jogador punido -25",
        effects: {
          moraleChange: 5,
          playerMoralChange: { target: "random", value: -25 }
        }
      },
      {
        text: "Passar o pano discretamente",
        effectText: "Moral do jogador +15, Moral Geral do time -8",
        effects: {
          moraleChange: -8,
          playerMoralChange: { target: "random", value: 15 }
        }
      }
    ]
  },
  {
    id: "academy_wonderkid",
    title: "Peneira Surpresa",
    icon: "🌱",
    description: "Um garoto de 16 anos arrebentou jogando na várzea local. O olheiro recomenda trazê-lo imediatamente para a base antes que rivais o contratem.",
    options: [
      {
        text: "Pagar taxa de formação e trazer",
        effectText: "Orçamento -R$ 20.000, Novo jovem promissor no time da base",
        effects: {
          budgetChange: -20000
        }
      },
      {
        text: "Deixar passar",
        effectText: "Sem alteração no orçamento ou base",
        effects: {}
      }
    ]
  }
];

export function getRandomEvent(): GameEvent {
  const index = Math.floor(Math.random() * EVENT_POOL.length);
  // Return a copy to avoid mutating the master pool
  return JSON.parse(JSON.stringify(EVENT_POOL[index]));
}
