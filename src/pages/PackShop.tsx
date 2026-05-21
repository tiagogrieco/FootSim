// ========================================
// PackShop — Gacha Pack Opening System
// ========================================

import { useState, useCallback } from "react";
import { useGame } from "../context/GameContext";
import PlayerCard from "../components/PlayerCard";
import PackRevealCinematic from "../components/PackRevealCinematic";
import { PACK_TYPES, RARITY_CONFIG, type PackType, type CardRarity } from "../types/rpg";
import { rollRarity, generateRPGAttributes, initRPGData } from "../engine/rpgEngine";
import type { Player, Position } from "../types/game";
import { getPositionCategory } from "../types/game";

const POSITIONS: Position[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "CF"];

const FIRST_NAMES = [
  "Lucas", "Gabriel", "Pedro", "Rafael", "Diego", "Carlos", "Matheus", "Bruno",
  "Felipe", "André", "Thiago", "Marcos", "Gustavo", "Leonardo", "Ricardo",
  "Daniel", "Eduardo", "Victor", "Henrique", "Rodrigo", "Caio", "Vinícius",
  "Neymar", "Luan", "Arthur", "Emerson", "Wesley", "Igor", "Alex", "Jean",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Rodrigues",
  "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Barbosa", "Ribeiro",
  "Carvalho", "Gomes", "Martins", "Rocha", "Moreira", "Cardoso", "Cruz",
  "Monteiro", "Teixeira", "Vieira", "Freitas", "Campos", "Pinto", "Nunes",
];

const NATIONALITIES = [
  "Brazil", "Argentina", "Colombia", "Uruguay", "Portugal", "Spain",
  "France", "Germany", "Italy", "England", "Netherlands", "Belgium",
  "Nigeria", "Ghana", "Senegal", "Japan", "South Korea", "Mexico",
];

let nextId = 50000;

function generateCardPlayer(rarity: CardRarity): Player {
  const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
  const posCategory = getPositionCategory(pos);
  const { attrs, ca } = generateRPGAttributes(rarity);
  const rpgData = initRPGData(ca, rarity);

  const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
  const age = rarity === "legendary" ? 24 + Math.floor(Math.random() * 6) : 18 + Math.floor(Math.random() * 15);

  const player: Player = {
    id: nextId++,
    name,
    age,
    nationality: NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)],
    position: pos,
    positionCategory: posCategory,
    shirtNumber: 1 + Math.floor(Math.random() * 99),
    attributes: attrs,
    currentAbility: ca,
    potentialAbility: Math.min(99, ca + Math.floor(Math.random() * 15)),
    morale: 60 + Math.floor(Math.random() * 30),
    fitness: 80 + Math.floor(Math.random() * 20),
    marketValue: ca * ca * 500 + Math.floor(Math.random() * 100000),
    wage: ca * 200 + Math.floor(Math.random() * 5000),
    seasonStats: { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, avgRating: 0, totalRating: 0, cleanSheets: 0, motm: 0 },
    preferredFoot: Math.random() > 0.7 ? "left" : Math.random() > 0.9 ? "both" : "right",
    personality: (["determined", "professional", "lazy", "temperamental", "leader"] as const)[Math.floor(Math.random() * 5)],
    form: 50 + Math.floor(Math.random() * 30),
    happiness: 60 + Math.floor(Math.random() * 30),
    rpg: rpgData,
  };

  return player;
}

export default function PackShop() {
  const { budget, addPackPlayers } = useGame();
  const [revealedCards, setRevealedCards] = useState<Player[]>([]);
  const [cinematicCards, setCinematicCards] = useState<Player[]>([]);
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
  const [selectedCard, setSelectedCard] = useState<Player | null>(null);

  const openPack = useCallback((pack: PackType) => {
    if (budget < pack.cost) return;

    setSelectedPack(pack);
    setRevealedCards([]);

    const cards: Player[] = [];
    for (let i = 0; i < pack.cardCount; i++) {
      const rarity = i === pack.cardCount - 1
        ? rollRarity(pack.guaranteedRarity)
        : rollRarity("common");
      cards.push(generateCardPlayer(rarity));
    }

    // Sort by rarity (best last for drama)
    const rarityOrder: CardRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
    cards.sort((a, b) => {
      const aIdx = rarityOrder.indexOf(a.rpg?.rarity ?? "common");
      const bIdx = rarityOrder.indexOf(b.rpg?.rarity ?? "common");
      return aIdx - bIdx;
    });

    setCinematicCards(cards);
  }, [budget]);

  const finishCinematic = useCallback(() => {
    addPackPlayers(cinematicCards);
    setRevealedCards(cinematicCards);
    setCinematicCards([]);
  }, [cinematicCards, addPackPlayers]);

  const closeReveal = () => {
    setRevealedCards([]);
    setSelectedPack(null);
    setSelectedCard(null);
  };

  return (
    <div style={{ padding: 20, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          🃏 Loja de Scouts
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          Abra pacotes para descobrir novos jogadores. Quanto melhor o pacote, maior a chance de cartas raras!
        </p>
        <div style={{
          marginTop: 8, fontSize: 14, fontWeight: 700,
          color: "var(--color-accent-secondary)",
        }}>
          💰 Orçamento: ${(budget / 1_000_000).toFixed(1)}M
        </div>
      </div>

      {/* Pack Shop Grid */}
      {revealedCards.length === 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {PACK_TYPES.map(pack => {
            const canAfford = budget >= pack.cost;
            return (
              <div
                key={pack.id}
                className="pack-shop-card"
                style={{
                  opacity: canAfford ? 1 : 0.4,
                  pointerEvents: canAfford ? "auto" : "none",
                }}
                onClick={() => openPack(pack)}
              >
                <div className="pack-icon">{pack.icon}</div>
                <div className="pack-name">{pack.name}</div>
                <div className="pack-desc">{pack.description}</div>
                <div style={{
                  display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center",
                }}>
                  {(["common", "uncommon", "rare", "epic", "legendary"] as CardRarity[])
                    .filter((_, i) => i >= (["common", "uncommon", "rare", "epic", "legendary"] as CardRarity[]).indexOf(pack.guaranteedRarity))
                    .map(r => (
                      <span key={r} className="rarity-pill" style={{
                        background: `${RARITY_CONFIG[r].color}15`,
                        color: RARITY_CONFIG[r].color,
                        border: `1px solid ${RARITY_CONFIG[r].color}30`,
                      }}>
                        {RARITY_CONFIG[r].label}
                      </span>
                    ))
                  }
                </div>
                <div className="pack-price">
                  ${(pack.cost / 1000).toFixed(0)}K
                </div>
                <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Abrir Pacote
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Cinematic walkout */}
      {cinematicCards.length > 0 && selectedPack && (
        <PackRevealCinematic
          packIcon={selectedPack.icon}
          packName={selectedPack.name}
          cards={cinematicCards}
          onComplete={finishCinematic}
        />
      )}

      {/* Revealed Cards */}
      {revealedCards.length > 0 && (
        <div>
          <div style={{
            textAlign: "center", marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              ✨ Jogadores Descobertos!
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
              Clique em uma carta para ver detalhes
            </p>
          </div>

          <div style={{
            display: "flex", flexWrap: "wrap", gap: 16,
            justifyContent: "center", marginBottom: 24,
          }}>
            {revealedCards.map((player, i) => (
              <div key={player.id} className="pack-reveal-card" style={{ animationDelay: `${i * 0.15}s` }}>
                <PlayerCard
                  player={player}
                  size="md"
                  selected={selectedCard?.id === player.id}
                  onClick={setSelectedCard}
                />
              </div>
            ))}
          </div>

          {/* Selected card detail */}
          {selectedCard && (
            <div style={{
              background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)", padding: 16, maxWidth: 500, margin: "0 auto",
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {selectedCard.name}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div><span style={{ color: "var(--color-text-muted)" }}>Posição:</span> {selectedCard.position}</div>
                <div><span style={{ color: "var(--color-text-muted)" }}>Idade:</span> {selectedCard.age}</div>
                <div><span style={{ color: "var(--color-text-muted)" }}>Nação:</span> {selectedCard.nationality}</div>
                <div><span style={{ color: "var(--color-text-muted)" }}>CA:</span> {selectedCard.currentAbility}</div>
                <div><span style={{ color: "var(--color-text-muted)" }}>PA:</span> {selectedCard.potentialAbility}</div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>Raridade:</span>{" "}
                  <span style={{ color: RARITY_CONFIG[selectedCard.rpg?.rarity ?? "common"].color, fontWeight: 700 }}>
                    {RARITY_CONFIG[selectedCard.rpg?.rarity ?? "common"].label}
                  </span>
                </div>
              </div>
              {selectedCard.rpg?.traits && selectedCard.rpg.traits.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, fontWeight: 600 }}>TRAITS:</div>
                  {selectedCard.rpg.traits.map(t => (
                    <div key={t.id} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span>{t.icon}</span>
                      <span style={{ fontWeight: 600 }}>{t.name}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>— {t.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button className="btn-secondary" onClick={closeReveal}>
              ← Voltar à Loja
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
