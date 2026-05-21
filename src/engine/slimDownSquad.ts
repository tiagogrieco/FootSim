// Reduz squad size + cap CA pra fazer pacotes virarem upgrade real.
// Aplicado uma vez em startNewGame.

import type { Player, PlayerAttributes, PositionCategory } from "../types/game";
import { calculateCA } from "../types/game";

interface SlimOpts {
  maxSize?: number;     // tamanho total do squad
  caCap?: number;       // ninguém acima disso
  caSoftCap?: number;   // a partir daqui começa a comprimir
  compression?: number; // 0..1 — quanto do excesso preserva
}

const DEFAULTS: Required<SlimOpts> = {
  maxSize: 16,
  caCap: 78,
  caSoftCap: 72,
  compression: 0.35,
};

// Composição mínima de squad enxuto
const SLIM_TEMPLATE: Record<PositionCategory, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 4,
};

function compressCA(ca: number, opts: Required<SlimOpts>): number {
  if (ca <= opts.caSoftCap) return ca;
  const excess = ca - opts.caSoftCap;
  const reduced = opts.caSoftCap + excess * opts.compression;
  return Math.round(Math.min(opts.caCap, reduced));
}

function scaleAttributes(attrs: PlayerAttributes, ratio: number): PlayerAttributes {
  const scale = (v: number) => Math.max(20, Math.min(99, Math.round(v * ratio)));
  return {
    pace: scale(attrs.pace),
    shooting: scale(attrs.shooting),
    passing: scale(attrs.passing),
    dribbling: scale(attrs.dribbling),
    defending: scale(attrs.defending),
    physical: scale(attrs.physical),
    goalkeeping: scale(attrs.goalkeeping ?? 30),
  };
}

export function slimDownSquad(squad: Player[], options: SlimOpts = {}): Player[] {
  const opts = { ...DEFAULTS, ...options };

  // 1. Bucket por categoria, top CA primeiro
  const buckets: Record<PositionCategory, Player[]> = {
    GK: [], DEF: [], MID: [], FWD: [],
  };
  for (const p of squad) buckets[p.positionCategory].push(p);
  (Object.keys(buckets) as PositionCategory[]).forEach(k => {
    buckets[k].sort((a, b) => b.currentAbility - a.currentAbility);
  });

  // 2. Pega cota por posição
  const picked: Player[] = [];
  (Object.keys(SLIM_TEMPLATE) as PositionCategory[]).forEach(cat => {
    const n = SLIM_TEMPLATE[cat];
    picked.push(...buckets[cat].slice(0, n));
  });

  // 3. Se sobrou vaga (cota não preenchida), completa com top CA geral restante
  if (picked.length < opts.maxSize) {
    const pickedIds = new Set(picked.map(p => p.id));
    const remaining = squad
      .filter(p => !pickedIds.has(p.id))
      .sort((a, b) => b.currentAbility - a.currentAbility);
    picked.push(...remaining.slice(0, opts.maxSize - picked.length));
  }

  // 4. Trunca se passou
  const finalSquad = picked.slice(0, opts.maxSize);

  // 5. Comprime CA + escala atributos proporcionalmente
  return finalSquad.map(p => {
    const newCA = compressCA(p.currentAbility, opts);
    if (newCA === p.currentAbility) return p;
    const ratio = newCA / p.currentAbility;
    const newAttrs = scaleAttributes(p.attributes, ratio);
    const recalculatedCA = calculateCA(newAttrs, p.positionCategory);
    return {
      ...p,
      attributes: newAttrs,
      currentAbility: recalculatedCA,
      // Mantém potential, mas cap também
      potentialAbility: Math.min(opts.caCap + 2, Math.max(recalculatedCA, p.potentialAbility)),
      marketValue: Math.round(p.marketValue * ratio),
      wage: Math.round(p.wage * ratio),
    };
  });
}
