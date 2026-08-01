import type { Card, DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createEvent } from "../events/index.ts";
import { surrender } from "./surrender.ts";

function makeCard(): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Monster",
    img: null,
    classe: "Dragon",
    atk: 1500,
    def: 1200,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

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
    turn: 3,
    phase: "battle",
    seed: 7,
    ...overrides,
  };
}

describe("surrender", () => {
  it("declares P2 as winner with surrender reason when P1 concedes", () => {
    const result = surrender(makeState(), { type: "surrender", player: "P1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.outcome).toEqual({
      status: "decisive",
      winner: "P2",
      loser: "P1",
      reason: "surrender",
    });
  });

  it("declares P1 as winner with surrender reason when P2 concedes", () => {
    const result = surrender(makeState(), { type: "surrender", player: "P2" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.outcome).toMatchObject({ winner: "P1", loser: "P2" });
  });

  it("preserves LP, field, hand, turn and phase from the moment of surrender", () => {
    const card = makeCard();
    const state = makeState({
      players: {
        P1: makePlayer({ lp: 4300, hand: [card] }),
        P2: makePlayer({ lp: 6100 }),
      },
    });

    const result = surrender(state, { type: "surrender", player: "P1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { outcome, ...rest } = result.value.state;
    expect(outcome).toBeDefined();
    expect(rest).toEqual(state);
  });

  it("emits no events", () => {
    const result = surrender(makeState(), { type: "surrender", player: "P1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.events).toEqual([]);
  });

  it("works with an open reaction window and preserves the window", () => {
    const pending = {
      type: "reaction_window",
      event: createEvent({ type: "onAttackDeclared", originPlayer: "P1" }),
      reactingPlayer: "P2",
    } as const;

    const result = surrender(makeState({ pending }), { type: "surrender", player: "P2" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.pending).toEqual(pending);
    expect(result.value.state.outcome).toMatchObject({ reason: "surrender" });
  });

  it("works when the conceding player is not active", () => {
    const state = makeState({ activePlayer: "P1" });

    const result = surrender(state, { type: "surrender", player: "P2" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.outcome).toMatchObject({ winner: "P1", loser: "P2" });
    expect(result.value.state.activePlayer).toBe("P1");
  });
});
