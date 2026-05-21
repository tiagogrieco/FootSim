import { useState, useEffect } from "react";
import { useBoard } from "../context/BoardContext";
import { useGame } from "../context/GameContext";
import { useMeta } from "../context/MetaContext";
import { generateGeminiPressQuestion, analyzeGeminiPressAnswer } from "../engine/geminiEngine";
import type { PressChoice } from "../types/board";

interface GeminiPressQuestion {
  reporter: string;
  question: string;
  suggestedAnswers: string[];
}

export default function PressConferenceModal() {
  const { pendingPress, chooseResponse, dismissPress } = useBoard();
  const { playerClub } = useGame();
  const { profile } = useMeta();

  const [hover, setHover] = useState<string | null>(null);

  // Gemini state
  const [aiQuestion, setAiQuestion] = useState<GeminiPressQuestion | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [submittingFreeText, setSubmittingFreeText] = useState(false);
  const [reaction, setReaction] = useState<{
    headline: string;
    effects: {
      confidence: number;
      morale: number;
      fans: number;
      media: "favorable" | "neutral" | "hostile";
    };
    reactionText: string;
  } | null>(null);

  // Load Gemini question if enabled
  useEffect(() => {
    if (!pendingPress) {
      const id = setTimeout(() => {
        setAiQuestion(null);
        setFreeText("");
        setReaction(null);
      }, 0);
      return () => clearTimeout(id);
    }

    const useAiPress = localStorage.getItem("footsim_use_ai_press") !== "false";
    const apiKey = localStorage.getItem("footsim_gemini_api_key");

    let loadId: ReturnType<typeof setTimeout> | null = null;
    if (useAiPress && apiKey) {
      loadId = setTimeout(() => setLoadingAi(true), 0);
      const opponentName = pendingPress.matchOpponent;
      const matchResult = pendingPress.matchResult;
      const context = pendingPress.question.context;
      const clubName = playerClub?.name || "Clube";
      const managerName = profile?.name || "Treinador";

      generateGeminiPressQuestion(clubName, opponentName, matchResult, context, managerName)
        .then(q => {
          if (q) {
            setAiQuestion(q);
          }
        })
        .catch(err => {
          console.error("Erro ao gerar pergunta com IA:", err);
        })
        .finally(() => {
          setLoadingAi(false);
        });
    }
    return () => { if (loadId) clearTimeout(loadId); };
  }, [pendingPress, playerClub, profile]);

  if (!pendingPress) return null;
  const q = pendingPress.question;

  const submitStatic = (c: PressChoice) => chooseResponse(c);

  const submitFreeText = async (textToSend: string) => {
    if (!textToSend.trim() || submittingFreeText) return;
    setSubmittingFreeText(true);

    const opponentName = pendingPress.matchOpponent;
    const matchResult = pendingPress.matchResult;
    const clubName = playerClub?.name || "Clube";
    const reporterName = aiQuestion?.reporter || q.reporter;
    const questionText = aiQuestion?.question || q.question;

    try {
      const analysis = await analyzeGeminiPressAnswer(
        clubName,
        opponentName,
        matchResult,
        questionText,
        reporterName,
        textToSend
      );

      if (analysis) {
        setReaction(analysis);
      } else {
        // Fallback: use static neutral analysis
        setReaction({
          headline: "Treinador se manifesta sobre a partida",
          effects: { confidence: 2, morale: 2, fans: 2, media: "neutral" },
          reactionText: "A resposta do treinador foi recebida com respeito pelos jornalistas presentes na coletiva."
        });
      }
    } catch (err) {
      console.error(err);
      // Fail-safe fallback
      setReaction({
        headline: "Treinador se manifesta sobre a partida",
        effects: { confidence: 1, morale: 1, fans: 1, media: "neutral" },
        reactionText: "A resposta foi curta, mas suficiente para acalmar a imprensa esportiva local."
      });
    } finally {
      setSubmittingFreeText(false);
    }
  };

  const handleFinishAiPress = () => {
    if (!reaction) return;
    const customChoice: PressChoice = {
      id: "gemini_custom_response",
      text: freeText || "Treinador respondeu às perguntas coletivas.",
      effects: {
        confidence: reaction.effects.confidence,
        morale: reaction.effects.morale,
        fans: reaction.effects.fans,
        media: reaction.effects.media,
      },
      responseHeadline: reaction.headline,
    };
    chooseResponse(customChoice);
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={ribbon}>🎙️ COLETIVA DE IMPRENSA</div>
        <div style={subtitle}>
          Pós-jogo vs <strong>{pendingPress.matchOpponent}</strong> ({pendingPress.matchResult})
        </div>

        {/* Loading AI State */}
        {loadingAi && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 20px" }}>
            <div style={pulseLoader} />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 700 }}>
              Jornalistas estão digitando perguntas dinâmicas...
            </span>
          </div>
        )}

        {/* AI Answer Analysis / Reaction State */}
        {!loadingAi && reaction && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-fade-in">
            <div style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              position: "relative"
            }}>
              <span style={{ position: "absolute", top: -8, left: 16, background: "var(--color-accent-primary)", color: "#fff", fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
                CAPA DOS JORNAIS
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 8, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
                "{reaction.headline}"
              </h3>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 10, lineHeight: 1.5, fontStyle: "italic" }}>
                {reaction.reactionText}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--color-bg-secondary)", borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Impacto da Entrevista:
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <Pill icon="👔" label="Diretoria" value={reaction.effects.confidence} />
                <Pill icon="💪" label="Elenco" value={reaction.effects.morale} />
                <Pill icon="📣" label="Torcida" value={reaction.effects.fans} />
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  padding: "2px 8px", borderRadius: 4,
                  background: reaction.effects.media === "favorable" ? "rgba(16, 185, 129, 0.1)" : reaction.effects.media === "hostile" ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
                  color: reaction.effects.media === "favorable" ? "#10b981" : reaction.effects.media === "hostile" ? "#ef4444" : "#3b82f6",
                  textTransform: "uppercase",
                }}>
                  Mídia: {reaction.effects.media === "favorable" ? "Focado/Positivo" : reaction.effects.media === "hostile" ? "Sensacionalista/Hostil" : "Neutro"}
                </span>
              </div>
            </div>

            <button onClick={handleFinishAiPress} className="btn-primary" style={{ width: "100%", padding: 12, fontWeight: 800 }}>
              Sair da Coletiva
            </button>
          </div>
        )}

        {/* AI Question & Input State */}
        {!loadingAi && !reaction && aiQuestion && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-fade-in">
            <div style={reporterBox}>
              <div style={reporterTag}>📰 {aiQuestion.reporter}</div>
              <div style={questionText}>"{aiQuestion.question}"</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                Sua Resposta Livre como Técnico:
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Fizemos uma boa partida, a torcida merecia a vitória e continuaremos trabalhando forte para o próximo jogo..."
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                disabled={submittingFreeText}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  resize: "none",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => submitFreeText(freeText)}
                disabled={!freeText.trim() || submittingFreeText}
                className="btn-primary"
                style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 800 }}
              >
                {submittingFreeText ? "Analisando Resposta..." : "Enviar Resposta Livre"}
              </button>
            </div>

            {/* Suggested answers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Opções sugeridas de assessoria:
              </span>
              {aiQuestion.suggestedAnswers.map((ans, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFreeText(ans);
                    submitFreeText(ans);
                  }}
                  disabled={submittingFreeText}
                  style={{
                    ...choiceBtn,
                    fontSize: 12,
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                >
                  "{ans}"
                </button>
              ))}
            </div>

            <button onClick={dismissPress} style={skipBtn} disabled={submittingFreeText}>
              Sem comentários (pular coletiva)
            </button>
          </div>
        )}

        {/* Offline Fallback: Static Choices */}
        {!loadingAi && !reaction && !aiQuestion && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="animate-fade-in">
            <div style={reporterBox}>
              <div style={reporterTag}>📰 {q.reporter}</div>
              <div style={questionText}>"{q.question}"</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {q.choices.map(c => {
                const tone = c.effects.media;
                const accent = tone === "favorable" ? "#10b981" : tone === "hostile" ? "#ef4444" : "#3b82f6";
                return (
                  <button
                    key={c.id}
                    onClick={() => submitStatic(c)}
                    onMouseEnter={() => setHover(c.id)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      ...choiceBtn,
                      borderColor: hover === c.id ? accent : "var(--color-border)",
                      background: hover === c.id ? `${accent}11` : "var(--color-bg-card)",
                      boxShadow: hover === c.id ? `0 0 16px ${accent}33` : "none",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", textAlign: "left" }}>
                      "{c.text}"
                    </div>
                    {hover === c.id && (
                      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                        {c.effects.confidence !== undefined && (
                          <Pill icon="👔" label="Diretoria" value={c.effects.confidence} />
                        )}
                        {c.effects.morale !== undefined && (
                          <Pill icon="💪" label="Elenco" value={c.effects.morale} />
                        )}
                        {c.effects.fans !== undefined && (
                          <Pill icon="📣" label="Torcida" value={c.effects.fans} />
                        )}
                        {c.effects.media && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                            padding: "2px 8px", borderRadius: 4,
                            background: `${accent}22`, color: accent,
                            textTransform: "uppercase",
                          }}>
                            Mídia · {c.effects.media === "favorable" ? "Favorável" : c.effects.media === "hostile" ? "Hostil" : "Neutra"}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button onClick={dismissPress} style={skipBtn}>
              Sem comentários (pular coletiva)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ icon, label, value }: { icon: string; label: string; value: number }) {
  const color = value > 0 ? "#10b981" : value < 0 ? "#ef4444" : "var(--color-text-muted)";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color, display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 4,
    }}>
      {icon} {label} {value > 0 ? `+${value}` : value}
    </span>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9990,
  background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modal: React.CSSProperties = {
  background: "var(--color-bg-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: 16, padding: 28, maxWidth: 560, width: "100%",
  boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
};
const ribbon: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px", borderRadius: 4,
  background: "linear-gradient(90deg, #ef4444, #f59e0b)",
  color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: 1.5,
};
const subtitle: React.CSSProperties = {
  fontSize: 12, color: "var(--color-text-muted)",
  marginTop: 8, marginBottom: 18,
};
const reporterBox: React.CSSProperties = {
  background: "rgba(59,130,246,0.08)",
  borderLeft: "3px solid #3b82f6",
  padding: "14px 16px", borderRadius: 6,
};
const reporterTag: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: "#3b82f6", letterSpacing: 0.5, marginBottom: 6,
};
const questionText: React.CSSProperties = {
  fontSize: 15, color: "var(--color-text-primary)", fontStyle: "italic", lineHeight: 1.5,
};
const choiceBtn: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 8,
  border: "1.5px solid var(--color-border)",
  background: "var(--color-bg-card)",
  textAlign: "left", cursor: "pointer",
  transition: "all 0.2s ease", fontFamily: "var(--font-sans)",
};
const skipBtn: React.CSSProperties = {
  marginTop: 16, width: "100%", padding: "8px",
  background: "transparent", border: "1px dashed var(--color-text-muted)",
  borderRadius: 6, color: "var(--color-text-muted)",
  fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)",
};
const pulseLoader: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "var(--color-accent-primary)",
  opacity: 0.8,
  animation: "pulse 1.2s infinite ease-in-out"
};
