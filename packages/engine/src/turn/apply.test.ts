import type { DuelState, PlayerField, PlayerState, ReactionWindow } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createEvent } from "../events/index.ts";
import { apply } from "./apply.ts";

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
    phase: "draw",
    seed: 1,
    ...overrides,
  };
}

const openWindow: ReactionWindow = {
  type: "reaction_window",
  event: createEvent({ type: "onAttackDeclared", originPlayer: "P1" }),
  reactingPlayer: "P2",
};

describe("apply", () => {
  it("recusa advance_phase quando state.pending está definido, devolvendo code reaction_window_open", () => {
    const state = makeState({ pending: openWindow });

    const result = apply(state, { type: "advance_phase" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("reaction_window_open");
    }
  });

  it("não altera o estado quando recusa por janela de reação aberta", () => {
    const state = makeState({ pending: openWindow });

    apply(state, { type: "advance_phase" });

    expect(state.pending).toBe(openWindow);
    expect(state.phase).toBe("draw");
  });

  it("roteia advance_phase corretamente", () => {
    const state = makeState({ phase: "draw" });

    const result = apply(state, { type: "advance_phase" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.phase).toBe("main");
    }
  });
});
