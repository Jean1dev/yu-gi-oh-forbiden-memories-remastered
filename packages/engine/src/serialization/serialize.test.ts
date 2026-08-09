import {
  INITIAL_LP,
  type Card,
  type DuelState,
  type PlayerField,
  type PlayerState,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { serialize } from "./serialize.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

const emptyZone = { occupied: false } as const;

function validCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 999999,
    tipo: "monstro",
    ...overrides,
  };
}

function emptyField(): PlayerField {
  return {
    monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
  };
}

function validPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: INITIAL_LP, hand: [], deck: [], field: emptyField(), handPlayUsed: false, ...overrides };
}

function validState(overrides: Partial<DuelState> = {}): DuelState {
  return {
    players: { P1: validPlayer(), P2: validPlayer() },
    activeField: null,
    activePlayer: "P1",
    turn: 1,
    phase: "main",
    seed: 1753617600,
    stats: emptyDuelStatsByPlayer(),
    ...overrides,
  };
}

const pendingSample = {
  type: "reaction_window" as const,
  event: {
    type: "onAttackDeclared" as const,
    originPlayer: "P1" as const,
    involvedCards: [validCard()],
    involvedZones: [],
    context: {},
  },
  reactingPlayer: "P2" as const,
};

describe("serialize", () => {
  it("returns an object structurally equal to the state received", () => {
    const state = validState({ pending: pendingSample });
    expect(serialize(state)).toEqual(state);
  });

  it("returns an independent copy, not the same reference as the state received", () => {
    const state = validState();
    const snapshot = serialize(state);

    expect(snapshot).not.toBe(state);
    expect(snapshot.players).not.toBe(state.players);
    expect(snapshot.players.P1).not.toBe(state.players.P1);
    expect(snapshot.players.P1.field).not.toBe(state.players.P1.field);
  });

  it("preserves the seed field", () => {
    const state = validState({ seed: 424242 });
    expect(serialize(state).seed).toBe(424242);
  });

  it("preserves a pending present in the state", () => {
    const state = validState({ pending: pendingSample });
    expect(serialize(state).pending).toEqual(pendingSample);
  });

  it("preserves a pending absent from the state", () => {
    const state = validState();
    expect(serialize(state).pending).toBeUndefined();
  });
});
