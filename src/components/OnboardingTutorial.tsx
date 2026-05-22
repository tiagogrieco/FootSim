import { useState, useEffect } from "react";

interface OnboardingTutorialProps {
  onClose: () => void;
}

const STEPS = [
  {
    title: "Bem-vindo ao FootSim!",
    body: "Você acabou de assumir o comando de um clube brasileiro. Sua missão é levar o time à glória conquistando títulos, gerenciando elenco e finanças.",
    icon: "👋",
  },
  {
    title: "Dashboard",
    body: "Aqui você vê a visão geral do clube: próxima partida, classificação, notificações e ações rápidas. Use 'Avançar Dia' para seguir no calendário.",
    icon: "📊",
  },
  {
    title: "Elenco & Táticas",
    body: "Em 'Elenco' você vê seus jogadores, lesões e forma. Em 'Táticas' ajusta a escalação titular, formação e mentalidade da equipe.",
    icon: "👥",
  },
  {
    title: "Partidas",
    body: "Quando chegar o dia de jogo, clique em 'Jogar Partida' para simular. Resultados afetam moral, confiança da diretoria e classificação.",
    icon: "⚽",
  },
  {
    title: "Transferências",
    body: "Compre e venda jogadores na aba 'Transferências'. Fique de olho na janela de transferências (rodadas 1-5 e 17-22).",
    icon: "💰",
  },
  {
    title: "Finanças",
    body: "Gerencie orçamento, patrocinadores e dívidas em 'Finanças'. Salários são pagos diariamente — não deixe o clube quebrar!",
    icon: "💵",
  },
];

export default function OnboardingTutorial({ onClose }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(id);
  }, []);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9995,
        background: "rgba(2, 6, 23, 0.88)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s",
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: "32px 28px",
          maxWidth: 460,
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          textAlign: "center",
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "transform 0.4s cubic-bezier(.2,1.5,.4,1)",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12 }}>{current.icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#f8fafc", marginBottom: 10 }}>
          {current.title}
        </h2>
        <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
          {current.body}
        </p>

        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? "#3b82f6" : "#334155",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "transparent",
                color: "#cbd5e1",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Voltar
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) onClose();
              else setStep(s => s + 1);
            }}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isLast ? "Começar a jogar! 🎮" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
