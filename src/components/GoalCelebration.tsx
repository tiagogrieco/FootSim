import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  show: boolean;
  scorerName?: string;
  teamName?: string;
  teamColor?: string;
  isPlayerGoal: boolean;
  onDone: () => void;
}

export default function GoalCelebration({
  show, scorerName, teamName, teamColor, isPlayerGoal, onDone,
}: Props) {
  const [visible, setVisible] = useState(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => setVisible(true), 0);
    const t1 = setTimeout(() => setVisible(false), 2200);
    const t2 = setTimeout(() => onDoneRef.current(), 2600);
    return () => { clearTimeout(id); clearTimeout(t1); clearTimeout(t2); };
  }, [show]);

  const tone = isPlayerGoal ? "#10b981" : "#ef4444";
  const word = isPlayerGoal ? "GOOOOOL!" : "GOL SOFRIDO";

  const confetti = useMemo(() => {
    if (!isPlayerGoal) return null;
    return Array.from({ length: 40 }, (_, i) => (
      <span
        key={i}
        className="goal-confetti"
        style={{
          left: `${(i * 37 + 13) % 100}%`,
          background: [tone, "#f59e0b", "#3b82f6", "#ef4444", "#fff"][i % 5],
          animationDelay: `${(i * 0.07) % 0.6}s`,
          animationDuration: `${1.2 + (i * 0.03) % 1.2}s`,
        }}
      />
    ));
  }, [isPlayerGoal, tone]);

  if (!show) return null;

  return (
    <div
      className="goal-overlay"
      style={{
        opacity: visible ? 1 : 0,
        background: `radial-gradient(circle at center, ${tone}55 0%, rgba(0,0,0,0.85) 70%)`,
      }}
    >
      {confetti}

      <div
        className="goal-word"
        style={{
          color: tone,
          textShadow: `0 0 40px ${tone}, 0 0 80px ${tone}88, 0 4px 0 rgba(0,0,0,0.6)`,
          transform: visible ? "scale(1) rotate(-2deg)" : "scale(0.3) rotate(-15deg)",
        }}
      >
        {word}
      </div>

      {scorerName && (
        <div className="goal-scorer">
          <span style={{ color: teamColor || tone, fontWeight: 900 }}>{scorerName}</span>
          {teamName && (
            <span style={{ color: "#8b9bb4", fontSize: "16px", fontWeight: 500, marginLeft: 10 }}>
              ({teamName})
            </span>
          )}
        </div>
      )}

      <div className="goal-flash" style={{ background: tone }} />
    </div>
  );
}
