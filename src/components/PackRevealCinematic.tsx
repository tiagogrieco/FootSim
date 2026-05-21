// Cinematic walkout-style pack opening, FUT-inspired.
// Reveal one card at a time with rarity-specific build-up.

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { Player } from "../types/game";
import PlayerCard from "./PlayerCard";
import { RARITY_CONFIG, type CardRarity } from "../types/rpg";

type Phase = "intro" | "anticipation" | "reveal" | "done";

interface Props {
  packIcon: string;
  packName: string;
  cards: Player[];
  onComplete: () => void;
}

function playRevealSound(rarity: CardRarity) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const t = ctx.currentTime;

    if (rarity === "legendary") {
      // Triumphant rising fanfare
      const freqs = [392, 523, 659, 784];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = f;
        g.gain.value = 0;
        o.connect(g).connect(ctx.destination);
        const s = t + i * 0.18;
        g.gain.linearRampToValueAtTime(0.18, s + 0.02);
        g.gain.linearRampToValueAtTime(0, s + 0.45);
        o.start(s); o.stop(s + 0.5);
      });
    } else if (rarity === "epic") {
      const freqs = [440, 587, 698];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = f;
        g.gain.value = 0;
        o.connect(g).connect(ctx.destination);
        const s = t + i * 0.14;
        g.gain.linearRampToValueAtTime(0.14, s + 0.02);
        g.gain.linearRampToValueAtTime(0, s + 0.32);
        o.start(s); o.stop(s + 0.35);
      });
    } else if (rarity === "rare") {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.value = 0; o.connect(g).connect(ctx.destination);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      o.frequency.linearRampToValueAtTime(1320, t + 0.3);
      g.gain.linearRampToValueAtTime(0, t + 0.45);
      o.start(t); o.stop(t + 0.5);
    } else {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = 440;
      g.gain.value = 0; o.connect(g).connect(ctx.destination);
      g.gain.linearRampToValueAtTime(0.1, t + 0.02);
      g.gain.linearRampToValueAtTime(0, t + 0.2);
      o.start(t); o.stop(t + 0.25);
    }
    setTimeout(() => ctx.close(), 2500);
  } catch { /* audio ignored */ }
}

function packRipSound() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = 1 - (i / data.length);
      data[i] = (Math.random() * 2 - 1) * env * 0.6;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter(); filter.type = "highpass"; filter.frequency.value = 1500;
    const g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start();
    setTimeout(() => ctx.close(), 600);
  } catch { /* */ }
}

export default function PackRevealCinematic({ packIcon, packName, cards, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [skipAll, setSkipAll] = useState(false);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = cards[index];
  const rarity = current?.rpg?.rarity ?? "common";
  const cfg = RARITY_CONFIG[rarity];

  const clearTimer = () => { if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current); };

  const goToReveal = useCallback(() => {
    clearTimer();
    setPhase("anticipation");
    phaseTimerRef.current = setTimeout(() => {
      setPhase("reveal");
      playRevealSound(rarity);
    }, rarity === "legendary" ? 1400 : rarity === "epic" ? 1000 : rarity === "rare" ? 700 : 350);
  }, [rarity]);

  const advance = useCallback(() => {
    clearTimer();
    if (phase === "intro") {
      packRipSound();
      goToReveal();
    } else if (phase === "anticipation") {
      setPhase("reveal");
      playRevealSound(rarity);
    } else if (phase === "reveal") {
      if (index + 1 < cards.length) {
        setIndex(i => i + 1);
        setPhase("anticipation");
        phaseTimerRef.current = setTimeout(() => {
          setPhase("reveal");
          const next = cards[index + 1]?.rpg?.rarity ?? "common";
          playRevealSound(next);
        }, cards[index + 1]?.rpg?.rarity === "legendary" ? 1400
           : cards[index + 1]?.rpg?.rarity === "epic" ? 1000
           : cards[index + 1]?.rpg?.rarity === "rare" ? 700 : 350);
      } else {
        setPhase("done");
        phaseTimerRef.current = setTimeout(onComplete, 400);
      }
    }
  }, [phase, index, cards, rarity, goToReveal, onComplete]);

  // Skip all → fast-forward to done
  const handleSkip = useCallback(() => {
    setSkipAll(true);
    clearTimer();
    setPhase("done");
    setTimeout(onComplete, 200);
  }, [onComplete]);

  // Key handlers (space/enter advance, esc skip)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); }
      else if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, handleSkip]);

  useEffect(() => () => clearTimer(), []);

  const confetti = useMemo(() => Array.from({ length: rarity === "legendary" ? 60 : 30 }).map((_, i) => (
    <span key={i} className="pack-cine-confetti" style={{
      left: `${(i * 37 + 13) % 100}%`,
      background: [cfg.color, "#fff", "#fbbf24", "#fff"][i % 4],
      animationDelay: `${(i * 0.019) % 0.5}s`,
      animationDuration: `${1.2 + (i * 0.047) % 1.3}s`,
    }} />
  )), [rarity, cfg.color]);

  if (skipAll) return null;

  const showConfetti = phase === "reveal" && (rarity === "legendary" || rarity === "epic");

  return (
    <div className="pack-cinematic" onClick={advance}>
      {/* Skip button */}
      <button
        onClick={(e) => { e.stopPropagation(); handleSkip(); }}
        className="pack-cine-skip"
      >
        Pular tudo ⏭
      </button>

      {/* Progress dots */}
      <div className="pack-cine-progress">
        {cards.map((c, i) => (
          <span key={i} style={{
            background: i < index || (i === index && phase === "reveal")
              ? RARITY_CONFIG[c.rpg?.rarity ?? "common"].color
              : "rgba(255,255,255,0.2)",
            width: i === index ? 24 : 10,
          }} />
        ))}
      </div>

      {/* Phase: intro — pack floats and pulses */}
      {phase === "intro" && (
        <div className="pack-cine-stage">
          <div className="pack-cine-pack">
            <div className="pack-cine-icon">{packIcon}</div>
            <div className="pack-cine-pack-name">{packName}</div>
          </div>
          <div className="pack-cine-hint">Clique ou pressione ESPAÇO para abrir</div>
        </div>
      )}

      {/* Phase: anticipation — beam of light, color hints rarity */}
      {phase === "anticipation" && (
        <div className="pack-cine-stage">
          <div className="pack-cine-aura" style={{
            background: `radial-gradient(circle, ${cfg.color}88 0%, ${cfg.color}22 30%, transparent 70%)`,
          }} />
          <div className="pack-cine-beams" style={{ filter: `drop-shadow(0 0 40px ${cfg.color})` }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="pack-cine-beam" style={{
                background: `linear-gradient(180deg, ${cfg.color}, transparent)`,
                transform: `rotate(${i * 30}deg) translateY(-50%)`,
                animationDelay: `${i * 0.03}s`,
              }} />
            ))}
          </div>
          <div className="pack-cine-card-back" style={{
            background: cfg.bgGradient,
            border: `2px solid ${cfg.borderColor}`,
            boxShadow: `0 0 60px ${cfg.glow}, 0 0 120px ${cfg.glow}`,
          }}>
            <div style={{ fontSize: 70 }}>?</div>
          </div>
          <div className="pack-cine-hint" style={{ color: cfg.color, fontWeight: 800 }}>
            {rarity === "legendary" ? "✨ ALGO LENDÁRIO! ✨"
              : rarity === "epic" ? "💜 ÉPICO! 💜"
              : rarity === "rare" ? "🔵 Algo bom..."
              : "Revelando..."}
          </div>
        </div>
      )}

      {/* Phase: reveal — card walkout */}
      {phase === "reveal" && current && (
        <div className="pack-cine-stage">
          <div className="pack-cine-walkout" key={`walk-${index}-${current.id}`}>
            <PlayerCard player={current} size="lg" showStats />
          </div>
          <div style={{
            marginTop: 14, color: cfg.color, fontSize: 22, fontWeight: 900,
            textTransform: "uppercase", letterSpacing: 2,
            textShadow: `0 0 20px ${cfg.glow}`,
          }}>
            {cfg.label}
          </div>
          <div className="pack-cine-hint">
            {index + 1 < cards.length ? "▶ Próxima carta" : "▶ Finalizar"}
          </div>
        </div>
      )}

      {showConfetti && (
        <div className="pack-cine-confetti-wrap">
          {confetti}
        </div>
      )}
    </div>
  );
}
