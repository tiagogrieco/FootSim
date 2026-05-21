import type { Player } from "../types/game";

export interface GeminiPressAnalysis {
  headline: string;
  effects: {
    confidence: number; // -10 to 10
    morale: number;     // -15 to 15
    fans: number;       // -15 to 15
    media: "favorable" | "neutral" | "hostile";
  };
  reactionText: string;
}

export interface GeminiPressQuestion {
  reporter: string;
  question: string;
  suggestedAnswers: string[];
}

export function getGeminiApiKey(): string | null {
  return localStorage.getItem("footsim_gemini_api_key");
}

export function setGeminiApiKey(key: string) {
  if (key) {
    localStorage.setItem("footsim_gemini_api_key", key.trim());
  } else {
    localStorage.removeItem("footsim_gemini_api_key");
  }
}

/**
 * Call Gemini 2.5 Flash to generate a dynamic press conference question
 */
export async function generateGeminiPressQuestion(
  clubName: string,
  opponentName: string,
  matchResult: string,
  context: "win" | "loss" | "thrashing_win" | "thrashing_loss" | "derby_win" | "derby_loss" | "draw" | string,
  managerName: string
): Promise<GeminiPressQuestion | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
Você é um repórter esportivo cobrindo a partida de futebol do clube ${clubName} contra o rival/oponente ${opponentName}.
O resultado do jogo foi ${matchResult} (gols de ${clubName} x gols de ${opponentName}) sob o contexto de "${context}".
O técnico do ${clubName} é o ${managerName}.

Gere uma pergunta de coletiva de imprensa dinâmica, desafiadora e imersiva. A pergunta deve ser formulada em Português do Brasil.
Retorne obrigatoriamente um objeto JSON com o seguinte formato exato:
{
  "reporter": "Nome fictício do jornalista e seu veículo de imprensa (ex: 'Mauro Cezar (UOL)', 'André Rizek (SporTV)')",
  "question": "A pergunta provocativa ou curiosa feita diretamente ao técnico",
  "suggestedAnswers": [
    "Opção 1 de resposta rápida/pronta (ex: exaltação do elenco)",
    "Opção 2 de resposta rápida/pronta (ex: cobrança tática ou postura firme)",
    "Opção 3 de resposta rápida/pronta (ex: foco na torcida ou no próximo jogo)"
  ]
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API Gemini: ${response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return null;

    return JSON.parse(textContent) as GeminiPressQuestion;
  } catch (error) {
    console.error("Falha ao gerar pergunta com Gemini:", error);
    return null;
  }
}

/**
 * Call Gemini 2.5 Flash to analyze a free-text manager answer in a press conference
 */
export async function analyzeGeminiPressAnswer(
  clubName: string,
  opponentName: string,
  matchResult: string,
  question: string,
  reporter: string,
  managerAnswer: string
): Promise<GeminiPressAnalysis | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
O técnico do clube ${clubName} concedeu uma coletiva após enfrentar o ${opponentName} (Resultado: ${matchResult}).
O repórter ${reporter} perguntou: "${question}"
O técnico respondeu: "${managerAnswer}"

Analise de forma realista o impacto da resposta do técnico no ambiente do clube.
Considere o tom da resposta: se foi arrogante, humilde, culpou a arbitragem, elogiou a torcida, criticou os jogadores ou assumiu a culpa.
O impacto nos jogadores (morale) e na diretoria (confidence) deve ser coerente.

Retorne obrigatoriamente um objeto JSON com o seguinte formato exato:
{
  "headline": "A manchete de jornal gerada pela resposta (ex: 'Técnico assume a culpa pela derrota dolorosa')",
  "effects": {
    "confidence": valor numérico inteiro de -10 a 10 indicando o impacto na confiança da diretoria,
    "morale": valor numérico inteiro de -15 a 15 indicando o impacto no moral do elenco de jogadores,
    "fans": valor numérico inteiro de -15 a 15 indicando o impacto na satisfação da torcida,
    "media": "favorable" ou "neutral" ou "hostile" (tom geral da cobertura de imprensa)
  },
  "reactionText": "Um parágrafo curto descrevendo a reação dos jornalistas presentes na sala e o clima deixado no vestiário."
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API Gemini: ${response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return null;

    return JSON.parse(textContent) as GeminiPressAnalysis;
  } catch (error) {
    console.error("Falha ao analisar resposta com Gemini:", error);
    return null;
  }
}

/**
 * Generate a dynamic match news summary using Gemini 2.5 Flash
 */
export async function generateGeminiMatchNews(
  clubName: string,
  opponentName: string,
  matchResult: string,
  matchStats: {
    homeShots: number;
    awayShots: number;
    homePossession: number;
    awayPossession: number;
    homeFouls: number;
    awayFouls: number;
  },
  goals: Array<{ minute: number; scorer: string; clubId: number }>
): Promise<{ title: string; content: string } | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
Gere uma notícia jornalística esportiva para o feed de notícias do jogo sobre a partida de futebol:
${clubName} contra ${opponentName}.
Resultado final: ${matchResult}.

Detalhes da partida:
- Chutes: ${clubName} fez ${matchStats.homeShots} chutes, ${opponentName} fez ${matchStats.awayShots} chutes.
- Posse de bola: ${clubName} teve ${matchStats.homePossession}%, ${opponentName} teve ${matchStats.awayPossession}%.
- Gols marcados: ${JSON.stringify(goals)}

Gere uma notícia emocionante, contendo título chamativo e um parágrafo de conteúdo jornalístico bem redigido e realista.
Retorne obrigatoriamente um objeto JSON com o seguinte formato exato:
{
  "title": "Título da matéria (ex: 'Massacre! Palmeiras goleia Santos no clássico')",
  "content": "Parágrafo descrevendo os destaques da partida com tom jornalístico esportivo real."
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return null;

    return JSON.parse(textContent) as { title: string; content: string };
  } catch (error) {
    console.error("Falha ao gerar notícias com Gemini:", error);
    return null;
  }
}

/**
 * Generate a descriptive, technical scout report for a player
 */
export async function generateScoutReport(player: Player): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
Você é o olheiro-chefe de um clube de futebol. Faça um relatório de observação técnico e imersivo em Português do Brasil para o jogador:
Nome: ${player.name}
Idade: ${player.age} anos
Posição: ${player.position} (${player.positionCategory})
CA (Habilidade Atual): ${player.currentAbility}/100
PA (Potencial): ${player.potentialAbility}/100
Personalidade: ${player.personality}
Atributos Principais: Velocidade: ${player.attributes.pace}, Finalização: ${player.attributes.shooting}, Passe: ${player.attributes.passing}, Drible: ${player.attributes.dribbling}, Defesa: ${player.attributes.defending}, Físico: ${player.attributes.physical}, Goleiro: ${player.attributes.goalkeeping}.

Escreva um relatório descritivo contendo exatamente de 2 a 3 frases. O relatório deve destacar as qualidades técnicas do jogador com base em seus atributos mais altos, alertar sobre suas fraquezas (atributos baixos ou idade) e fazer uma breve comparação estilística com algum jogador real famoso (ativo ou histórico) que possua características semelhantes. Evite jargões excessivos e foque no estilo de jogo.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return textContent ? textContent.trim() : null;
  } catch (error) {
    console.error("Falha ao gerar relatório de olheiro:", error);
    return null;
  }
}

export interface GeminiBoardReview {
  subject: string;
  body: string;
  wantsObjective: boolean;
  targetPoints?: number;
  gamesLimit?: number;
}

/**
 * Generate a monthly board evaluation report email
 */
export async function generateBoardReviewEmail(
  clubName: string,
  standingPosition: number,
  points: number,
  recentResults: string[],
  boardConfidence: number
): Promise<GeminiBoardReview | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
Você é a diretoria do clube de futebol ${clubName}. Avalie o desempenho do técnico no fechamento do mês.
Informações atuais:
- Posição na tabela: ${standingPosition}º colocado
- Pontos conquistados: ${points}
- Resultados recentes (últimos jogos): ${recentResults.join(", ") || "Sem jogos no mês"}
- Confiança atual da diretoria: ${boardConfidence}/100

Escreva um e-mail formal e realista em Português do Brasil para o treinador.
Se a confiança da diretoria for baixa (abaixo de 40), o e-mail deve ter um tom de cobrança rígida ou ultimato. Caso seja média, um tom de cobrança normal por melhoras. Caso seja alta (acima de 70), elogios ao trabalho.

Além disso, caso a confiança esteja baixa (abaixo de 45), você deve sugerir a atribuição de uma meta de curto prazo obrigatória (wantsObjective = true). A meta será conquistar uma quantidade de pontos (targetPoints, entre 4 e 7) em uma série de partidas (gamesLimit, entre 3 e 4).

Retorne obrigatoriamente um objeto JSON com o formato exato:
{
  "subject": "Assunto do e-mail (ex: 'Cobrança por Resultados' ou 'Parabéns pelo Desempenho')",
  "body": "Conteúdo completo do e-mail formal direcionado ao técnico",
  "wantsObjective": true ou false,
  "targetPoints": número (apenas se wantsObjective for true),
  "gamesLimit": número (apenas se wantsObjective for true)
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return null;

    return JSON.parse(textContent) as GeminiBoardReview;
  } catch (error) {
    console.error("Falha ao gerar e-mail da diretoria:", error);
    return null;
  }
}

export interface GeminiPlayerDrama {
  subject: string;
  body: string;
  options: {
    id: string;
    text: string;
    replyText: string;
    moraleEffect: number;
    happinessEffect: number;
  }[];
}

/**
 * Generate a complaint email from an unhappy player with interactive responses
 */
export async function generatePlayerDramaEmail(
  player: Player,
  clubName: string
): Promise<GeminiPlayerDrama | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
Você é o jogador de futebol ${player.name} (Idade: ${player.age}, Posição: ${player.position}, Felicidade: ${player.happiness}/100) que joga no ${clubName}.
Sua felicidade está baixa e você decidiu enviar um e-mail de cobrança para o treinador.
O motivo da cobrança deve ser coerente com seu perfil:
- Se for muito jovem (abaixo de 21) ou reserva, quer mais oportunidades e minutos no time titular.
- Se for uma estrela consagrada, pode reclamar de desgaste físico, de promessas de novos títulos, ou pedir aumento salarial.

Gere o e-mail em Português do Brasil de forma realista e direta.
Forneça também exatamente 3 opções de resposta para o treinador responder à cobrança, com impactos lógicos nos sentimentos do jogador:
- Opção 1: Prometer o que ele quer (ex: titularidade, renegociar contrato). Aumenta moral/felicidade do jogador, mas pode gerar expectativa e desgaste financeiro se houver.
- Opção 2: Negativa direta/firmeza (ex: "Você precisa treinar mais", "O time está rendendo"). Diminui moral/felicidade, mas mostra autoridade.
- Opção 3: Resposta diplomática (ex: "Sua chance vai chegar", "Conversaremos no fim do mês"). Efeito neutro ou leve alteração.

Retorne obrigatoriamente um objeto JSON com o formato exato:
{
  "subject": "Assunto do e-mail (ex: 'Esclarecimento sobre tempo de jogo')",
  "body": "Corpo do e-mail escrito pelo jogador",
  "options": [
    {
      "id": "option_1",
      "text": "Texto da opção 1 (ex: 'Prometo colocá-lo como titular no próximo jogo')",
      "replyText": "Resposta oficial enviada (ex: 'Concordo com seu ponto. Você começará jogando')",
      "moraleEffect": número inteiro de -20 a 20,
      "happinessEffect": número inteiro de -20 a 20
    },
    {
      "id": "option_2",
      "text": "Texto da opção 2 (ex: 'Você precisa de mais intensidade nos treinos antes de ser titular')",
      "replyText": "Resposta oficial enviada (ex: 'Você é importante, mas precisa render mais nos treinos')",
      "moraleEffect": número inteiro de -20 a 20,
      "happinessEffect": número inteiro de -20 a 20
    },
    {
      "id": "option_3",
      "text": "Texto da opção 3 (ex: 'Fique tranquilo, teremos muitos jogos e você será acionado')",
      "replyText": "Resposta oficial enviada (ex: 'Estou monitorando seu desempenho, sua chance virá em breve')",
      "moraleEffect": número inteiro de -20 a 20,
      "happinessEffect": número inteiro de -20 a 20
    }
  ]
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return null;

    return JSON.parse(textContent) as GeminiPlayerDrama;
  } catch (error) {
    console.error("Falha ao gerar drama do jogador com Gemini:", error);
    return null;
  }
}

export function generateLocalPlayerDramaEmail(
  player: Player,
  clubName: string
): GeminiPlayerDrama {
  const isReserve = player.currentAbility < 70;
  const isYoung = player.age <= 21;

  if (isYoung || isReserve) {
    return {
      subject: `Falta de oportunidades no time titular - ${player.name}`,
      body: `Olá Professor,\n\nQueria conversar com você sobre a minha situação no elenco do ${clubName}. Sinto que estou treinando bem e mereço ter mais minutos de titular em campo. Como jovem/reserva, preciso jogar para continuar evoluindo. Se eu não estiver nos seus planos, prefiro ser emprestado ou negociado do que ficar apenas assistindo do banco de reservas.\n\nAguardo seu retorno,\n${player.name}`,
      options: [
        {
          id: "option_1",
          text: "Prometer chances: 'Vou te colocar como titular nos próximos jogos (promessa de 3 jogos)'",
          replyText: "Concordo com seu ponto, seu desempenho nos treinos é bom. Você terá espaço como titular nos próximos jogos.",
          moraleEffect: 15,
          happinessEffect: 20
        },
        {
          id: "option_2",
          text: "Negativa firme: 'Você ainda não está pronto. Precisa de mais intensidade nos treinos.'",
          replyText: "Ainda falta maturidade no seu jogo. Continue se dedicando no dia a dia e sua hora vai chegar.",
          moraleEffect: -15,
          happinessEffect: -15
        },
        {
          id: "option_3",
          text: "Colocar na lista de transferências: 'Se está insatisfeito, vou te listar para negociação'",
          replyText: "Entendo. Se você acha que seu futuro é fora daqui, vamos analisar propostas de transferência.",
          moraleEffect: -5,
          happinessEffect: -40
        }
      ]
    };
  } else {
    const proposedWage = Math.round(player.wage * 1.5);
    return {
      subject: `Solicitação de valorização salarial - ${player.name}`,
      body: `Professor,\n\nMeu empresário entrou em contato para conversar sobre o meu rendimento. Tenho sido peça fundamental para o ${clubName} e sinto que meu salário atual não condiz com minha importância no elenco. Gosto muito do clube, mas preciso que meu contrato seja revisado para refletir meu valor em campo. Uma valorização de 50% (para R$ ${proposedWage.toLocaleString('pt-BR')}/mês) seria o ideal.\n\nAtenciosamente,\n${player.name}`,
      options: [
        {
          id: "option_1",
          text: `Aprovar aumento: 'Aprovar novo salário de R$ ${proposedWage.toLocaleString('pt-BR')}/mês'`,
          replyText: "Você merece essa valorização pela sua liderança e dedicação. O aumento salarial está aprovado.",
          moraleEffect: 20,
          happinessEffect: 20
        },
        {
          id: "option_2",
          text: "Negar aumento: 'Não temos margem no orçamento de salários no momento'",
          replyText: "Reconheço sua importância, mas a situação financeira do clube não permite reajustes salariais agora.",
          moraleEffect: -15,
          happinessEffect: -20
        },
        {
          id: "option_3",
          text: "Firmeza tática: 'Foque no futebol, falaremos disso no fim da temporada'",
          replyText: "Agora estamos em um momento decisivo da temporada. Esqueça extracampo e mostre seu valor em campo.",
          moraleEffect: -10,
          happinessEffect: -10
        }
      ]
    };
  }
}
