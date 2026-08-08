import {
  INITIAL_LP,
  type Card,
  type DuelState,
  type PlayerField,
  type PlayerState,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { load } from "./load.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

const emptyZone = { occupied: false } as const;

function validCard(): Card {
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
  };
}

function emptyField(): PlayerField {
  return {
    monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
  };
}

function validPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    lp: INITIAL_LP,
    hand: [],
    deck: [],
    field: emptyField(),
    handPlayUsed: false,
    ...overrides,
  };
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

/** A valid state with P1's field replaced by an arbitrary shape, to test invariant violations. */
function stateWithP1Field(field: unknown) {
  const state = validState();
  return { ...state, players: { ...state.players, P1: { ...state.players.P1, field } } };
}

describe("load", () => {
  it("accepts a valid snapshot and returns a structurally equal DuelState", () => {
    const state = validState();
    const result = load(state);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value).toEqual(state);
  });

  it("returns an independent copy of the input value", () => {
    const state = validState();
    const result = load(state);

    if (!result.ok) throw new Error("expected ok");
    expect(result.value).not.toBe(state);
    expect(result.value.players).not.toBe(state.players);
  });

  const rejectionCases: ReadonlyArray<{ name: string; snapshot: unknown }> = [
    { name: "is not an object", snapshot: "not-an-object" },
    {
      name: "is missing the seed field",
      snapshot: (() => {
        const withoutSeed: Record<string, unknown> = { ...validState() };
        delete withoutSeed["seed"];
        return withoutSeed;
      })(),
    },
    { name: "has an unknown extra field", snapshot: { ...validState(), extra: "field" } },
    {
      name: "has an occupied monster zone without a card",
      snapshot: stateWithP1Field({
        monsters: [
          {
            occupied: true,
            position: "attack_face_up",
            hasAttacked: false,
            hasChangedPosition: false,
          },
          emptyZone,
          emptyZone,
          emptyZone,
          emptyZone,
        ],
        spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      }),
    },
    {
      name: "has an occupied monster zone without equips",
      snapshot: stateWithP1Field({
        monsters: [
          {
            occupied: true,
            card: validCard(),
            position: "attack_face_up",
            hasAttacked: false,
            hasChangedPosition: false,
          },
          emptyZone,
          emptyZone,
          emptyZone,
          emptyZone,
        ],
        spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      }),
    },
    {
      name: "locks the same player out of attacking twice",
      snapshot: {
        ...validState(),
        attackLocks: [
          { player: "P1", untilTurn: 7 },
          { player: "P1", untilTurn: 9 },
        ],
      },
    },
  ];

  for (const { name, snapshot } of rejectionCases) {
    it(`rejects a snapshot that ${name}`, () => {
      const result = load(snapshot);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected error");
      expect(result.error.code).toBe("invalid_snapshot");
    });
  }
});
