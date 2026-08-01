import type { DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { hasUsedHandPlay, markHandPlayUsed } from "./hand-play.ts";

function emptyField(): PlayerField {
  const zone = { occupied: false } as const;
  return {
    monsters: [zone, zone, zone, zone, zone],
    spells: [zone, zone, zone, zone, zone],
  };
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
    ...overrides,
  };
}

describe("hasUsedHandPlay", () => {
  it("devolve false para um jogador que ainda não jogou da mão neste turno", () => {
    const state = makeState();

    expect(hasUsedHandPlay(state, "P1")).toBe(false);
  });
});

describe("markHandPlayUsed", () => {
  it("marca o jogador informado como tendo jogado da mão", () => {
    const state = makeState();

    const next = markHandPlayUsed(state, "P1");

    expect(hasUsedHandPlay(next, "P1")).toBe(true);
  });

  it("não altera a flag do outro jogador", () => {
    const state = makeState();

    const next = markHandPlayUsed(state, "P1");

    expect(hasUsedHandPlay(next, "P2")).toBe(false);
  });

  it("é idempotente — chamar duas vezes não muda o resultado", () => {
    const state = makeState();

    const once = markHandPlayUsed(state, "P1");
    const twice = markHandPlayUsed(once, "P1");

    expect(twice).toEqual(once);
  });
});
