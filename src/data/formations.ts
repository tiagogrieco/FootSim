import type { Position } from "../types/game";

export type Formation = "4-2-3-1" | "4-3-3" | "4-4-2" | "3-5-2" | "4-1-4-1";

export interface PitchSlot {
  position: Position;
  x: number;
  y: number;
}

export const FORMATIONS: Record<Formation, PitchSlot[]> = {
  "4-2-3-1": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "CDM", x: 38, y: 55 },
    { position: "CDM", x: 62, y: 55 },
    { position: "LW", x: 18, y: 35 },
    { position: "CAM", x: 50, y: 38 },
    { position: "RW", x: 82, y: 35 },
    { position: "ST", x: 50, y: 15 },
  ],
  "4-3-3": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "CM", x: 30, y: 52 },
    { position: "CDM", x: 50, y: 58 },
    { position: "CM", x: 70, y: 52 },
    { position: "LW", x: 20, y: 25 },
    { position: "ST", x: 50, y: 18 },
    { position: "RW", x: 80, y: 25 },
  ],
  "4-4-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "LM", x: 18, y: 50 },
    { position: "CM", x: 38, y: 52 },
    { position: "CM", x: 62, y: 52 },
    { position: "RM", x: 82, y: 50 },
    { position: "ST", x: 38, y: 20 },
    { position: "ST", x: 62, y: 20 },
  ],
  "3-5-2": [
    { position: "GK", x: 50, y: 90 },
    { position: "CB", x: 28, y: 75 },
    { position: "CB", x: 50, y: 78 },
    { position: "CB", x: 72, y: 75 },
    { position: "LM", x: 12, y: 50 },
    { position: "CM", x: 35, y: 52 },
    { position: "CDM", x: 50, y: 58 },
    { position: "CM", x: 65, y: 52 },
    { position: "RM", x: 88, y: 50 },
    { position: "ST", x: 38, y: 20 },
    { position: "ST", x: 62, y: 20 },
  ],
  "4-1-4-1": [
    { position: "GK", x: 50, y: 90 },
    { position: "LB", x: 15, y: 72 },
    { position: "CB", x: 38, y: 75 },
    { position: "CB", x: 62, y: 75 },
    { position: "RB", x: 85, y: 72 },
    { position: "CDM", x: 50, y: 60 },
    { position: "LW", x: 18, y: 40 },
    { position: "CM", x: 38, y: 45 },
    { position: "CM", x: 62, y: 45 },
    { position: "RW", x: 82, y: 40 },
    { position: "ST", x: 50, y: 18 },
  ],
};
