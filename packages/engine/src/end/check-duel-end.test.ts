import type { DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { checkDuelEnd, isDuelOver } from "./check-duel-end.ts";

function emptyField(): PlayerField {
  const zone = { occupied: false } as const;
  return {
    monsters: [zone, zone, zone, zone, zone],
    spells: [zone, zone, zone, zone, zone],
  };
}

function makePlayer(lp: number): PlayerState {
  return { lp, hand: [], deck: [], field: emptyField(), handPlayUsed: false };
}

function makeState(overrides: Partial<DuelState> = {}): DuelState {
  return {
    players: { P1: makePlayer(8000), P2: makePlayer(8000) },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "main",
    seed: 1,
    ...overrides,
  };
}

describe("checkDuelEnd", () => {
  it("returns undefined while both players have LP and no deck-out flag", () => {
    expect(checkDuelEnd(makeState())).toBeUndefined();
  });

  it("declares lp_depleted with P2 as winner when P1 LP reaches 0", () => {
    const state = makeState({ players: { P1: makePlayer(0), P2: makePlayer(8000) } });

    expect(checkDuelEnd(state)).toEqual({
      status: "decisive",
      winner: "P2",
      loser: "P1",
      reason: "lp_depleted",
    });
  });

  it("declares lp_depleted with P1 as winner when P2 LP reaches 0", () => {
    const state = makeState({ players: { P1: makePlayer(1200), P2: makePlayer(0) } });

    expect(checkDuelEnd(state)).toEqual({
      status: "decisive",
      winner: "P1",
      loser: "P2",
      reason: "lp_depleted",
    });
  });

  it("declares draw when both players have 0 LP", () => {
    const state = makeState({ players: { P1: makePlayer(0), P2: makePlayer(0) } });

    expect(checkDuelEnd(state)).toEqual({
      status: "draw",
      winner: null,
      loser: null,
      reason: "draw",
    });
  });

  it.each(["P1", "P2"] as const)(
    "declares deck_out with %s's opponent as winner",
    (deckOutPlayer) => {
      expect(checkDuelEnd(makeState({ deckOutPlayer }))).toEqual({
        status: "decisive",
        winner: deckOutPlayer === "P1" ? "P2" : "P1",
        loser: deckOutPlayer,
        reason: "deck_out",
      });
    },
  );

  it("gives LP depletion precedence over deck-out when both conditions hold", () => {
    const state = makeState({
      players: { P1: makePlayer(3000), P2: makePlayer(0) },
      deckOutPlayer: "P1",
    });

    expect(checkDuelEnd(state)).toMatchObject({ loser: "P2", reason: "lp_depleted" });
  });

  it("does not end the duel for low LP, only for exactly 0 LP", () => {
    const state = makeState({ players: { P1: makePlayer(1), P2: makePlayer(8000) } });

    expect(checkDuelEnd(state)).toBeUndefined();
  });
});

describe("isDuelOver", () => {
  it("is false while the state has no outcome", () => {
    expect(isDuelOver(makeState())).toBe(false);
  });

  it("is true once the outcome is stamped", () => {
    const state = makeState({
      outcome: { status: "draw", winner: null, loser: null, reason: "draw" },
    });

    expect(isDuelOver(state)).toBe(true);
  });
});
