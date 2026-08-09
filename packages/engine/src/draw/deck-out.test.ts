import type { DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { getDeckOutPlayer, hasDeckedOut } from "./deck-out.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

function emptyField(): PlayerField {
  const zone = { occupied: false } as const;
  return { monsters: [zone, zone, zone, zone, zone], spells: [zone, zone, zone, zone, zone] };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false, ...overrides };
}

function makeState(overrides: Partial<DuelState> = {}): DuelState {
  return {
    players: { P1: makePlayer(), P2: makePlayer() },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "main",
    seed: 1,
    stats: emptyDuelStatsByPlayer(),
    ...overrides,
  };
}

describe("hasDeckedOut", () => {
  it("devolve false quando deckOutPlayer está ausente", () => {
    expect(hasDeckedOut(makeState())).toBe(false);
  });

  it("devolve true quando deckOutPlayer está definido", () => {
    expect(hasDeckedOut(makeState({ deckOutPlayer: "P1" }))).toBe(true);
  });
});

describe("getDeckOutPlayer", () => {
  it("devolve undefined quando nenhum deck-out ocorreu", () => {
    expect(getDeckOutPlayer(makeState())).toBeUndefined();
  });

  it("devolve o PlayerId marcado quando um deck-out ocorreu", () => {
    expect(getDeckOutPlayer(makeState({ deckOutPlayer: "P2" }))).toBe("P2");
  });
});
