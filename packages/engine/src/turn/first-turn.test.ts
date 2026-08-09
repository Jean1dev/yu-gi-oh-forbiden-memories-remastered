import type { DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { isFirstDuelTurn } from "./first-turn.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

function emptyField(): PlayerField {
  const zone = { occupied: false } as const;
  return {
    monsters: [zone, zone, zone, zone, zone],
    spells: [zone, zone, zone, zone, zone],
  };
}

function makePlayer(): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false };
}

function makeState(turn: number): DuelState {
  return {
    players: { P1: makePlayer(), P2: makePlayer() },
    activeField: null,
    activePlayer: "P1",
    turn,
    phase: "main",
    seed: 1,
    stats: emptyDuelStatsByPlayer(),
  };
}

describe("isFirstDuelTurn", () => {
  it("devolve true quando turn é 1", () => {
    expect(isFirstDuelTurn(makeState(1))).toBe(true);
  });

  it("devolve false quando turn é maior que 1", () => {
    expect(isFirstDuelTurn(makeState(2))).toBe(false);
  });
});
