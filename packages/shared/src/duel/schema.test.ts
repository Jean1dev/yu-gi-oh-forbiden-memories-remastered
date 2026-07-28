import { describe, expect, it } from "vitest";

import type { Card } from "../card/types.ts";
import { EVENT_TYPES, INITIAL_LP } from "./constants.ts";
import { DuelEventSchema, DuelStateSchema, ZoneReferenceSchema } from "./schema.ts";
import type { DuelState, MonsterPosition, PlayerField, PlayerState } from "./types.ts";

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
  return {
    lp: INITIAL_LP,
    hand: [],
    deck: [],
    field: emptyField(),
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
    ...overrides,
  };
}

/** A valid state with P1's field replaced by an arbitrary shape, to test invariant violations. */
function stateWithP1Field(field: unknown) {
  const state = validState();
  return {
    ...state,
    players: {
      ...state.players,
      P1: { ...state.players.P1, field },
    },
  };
}

describe("DuelStateSchema", () => {
  it("accepts an initial state with all zones empty and 8000 LP", () => {
    expect(DuelStateSchema.safeParse(validState()).success).toBe(true);
  });

  const positions: readonly MonsterPosition[] = [
    "attack_face_up",
    "attack_face_down",
    "defense_face_up",
    "defense_face_down",
  ];

  for (const position of positions) {
    it(`accepts an occupied monster zone in position ${position}`, () => {
      const state = stateWithP1Field({
        monsters: [
          {
            occupied: true,
            card: validCard(),
            position,
            hasAttacked: false,
            hasChangedPosition: false,
          },
          emptyZone,
          emptyZone,
          emptyZone,
          emptyZone,
        ],
        spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      });
      expect(DuelStateSchema.safeParse(state).success).toBe(true);
    });
  }

  it("rejects a monsters field with 4 zones", () => {
    const state = stateWithP1Field({
      monsters: [emptyZone, emptyZone, emptyZone, emptyZone],
      spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects a monsters field with 6 zones", () => {
    const state = stateWithP1Field({
      monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  for (const total of [4, 6]) {
    it(`rejects a spells field with ${String(total)} zones`, () => {
      const state = stateWithP1Field({
        monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
        spells: Array.from({ length: total }, () => emptyZone),
      });
      expect(DuelStateSchema.safeParse(state).success).toBe(false);
    });
  }

  it("rejects an occupied monster zone without the card field", () => {
    const state = stateWithP1Field({
      monsters: [
        { occupied: true, position: "attack_face_up", hasAttacked: false, hasChangedPosition: false },
        emptyZone,
        emptyZone,
        emptyZone,
        emptyZone,
      ],
      spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects an empty monster zone with hasAttacked present", () => {
    const state = stateWithP1Field({
      monsters: [{ occupied: false, hasAttacked: false }, emptyZone, emptyZone, emptyZone, emptyZone],
      spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects an occupied spell zone without faceUp", () => {
    const state = stateWithP1Field({
      monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      spells: [{ occupied: true, card: validCard() }, emptyZone, emptyZone, emptyZone, emptyZone],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("accepts an occupied spell zone with faceUp false (a set trap)", () => {
    const state = stateWithP1Field({
      monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      spells: [
        { occupied: true, card: validCard({ tipo: "armadilha" }), faceUp: false },
        emptyZone,
        emptyZone,
        emptyZone,
        emptyZone,
      ],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(true);
  });

  it("accepts an occupied spell zone with faceUp true (a revealed equip card)", () => {
    const state = stateWithP1Field({
      monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      spells: [
        { occupied: true, card: validCard({ tipo: "equipamento" }), faceUp: true },
        emptyZone,
        emptyZone,
        emptyZone,
        emptyZone,
      ],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(true);
  });

  it("rejects negative lp", () => {
    const state = validState({ players: { P1: validPlayer({ lp: -1 }), P2: validPlayer() } });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("accepts zero lp", () => {
    const state = validState({ players: { P1: validPlayer({ lp: 0 }), P2: validPlayer() } });
    expect(DuelStateSchema.safeParse(state).success).toBe(true);
  });

  it("rejects a turn below 1", () => {
    expect(DuelStateSchema.safeParse(validState({ turn: 0 })).success).toBe(false);
  });

  it("accepts a null activeField", () => {
    expect(DuelStateSchema.safeParse(validState({ activeField: null })).success).toBe(true);
  });

  it("accepts an activeField holding any canonical card", () => {
    const state = validState({ activeField: validCard({ numero: "134", tipo: "magica" }) });
    expect(DuelStateSchema.safeParse(state).success).toBe(true);
  });

  it("rejects an activePlayer outside P1 or P2", () => {
    const state = { ...validState(), activePlayer: "P3" };
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects a phase outside the four known ones", () => {
    const state = { ...validState(), phase: "extra" };
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects a card in hand that violates the 12-field canonical schema", () => {
    const state = validState();
    const invalidCard = { ...validCard(), tipo: "feitico" };
    const invalidState = {
      ...state,
      players: { ...state.players, P1: { ...state.players.P1, hand: [invalidCard] } },
    };
    expect(DuelStateSchema.safeParse(invalidState).success).toBe(false);
  });

  it("rejects an object with an unknown field at the root level", () => {
    const state = { ...validState(), extra: "unknown field" };
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("accepts a state with pending filled", () => {
    const state = {
      ...validState(),
      pending: {
        type: "reaction_window",
        event: baseEvent({ type: "onAttackDeclared" }),
        reactingPlayer: "P2",
      },
    };
    expect(DuelStateSchema.safeParse(state).success).toBe(true);
  });

  it("accepts a state without pending (optional field)", () => {
    expect(DuelStateSchema.safeParse(validState()).success).toBe(true);
  });
});

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "onTurnStart",
    originPlayer: "P1",
    involvedCards: [],
    involvedZones: [],
    context: {},
    ...overrides,
  };
}

describe("EVENT_TYPES", () => {
  it("contains exactly the ten expected types, including onPositionChange", () => {
    expect(EVENT_TYPES).toEqual([
      "onTurnStart",
      "onDraw",
      "onSummon",
      "onSet",
      "onFlip",
      "onPositionChange",
      "onAttackDeclared",
      "onDamage",
      "onDestroy",
      "onTurnEnd",
    ]);
  });
});

describe("DuelEventSchema", () => {
  it("accepts a well-formed event", () => {
    expect(DuelEventSchema.safeParse(baseEvent()).success).toBe(true);
  });

  it("rejects a type outside the ten known ones", () => {
    expect(DuelEventSchema.safeParse(baseEvent({ type: "onExplode" })).success).toBe(false);
  });

  it("accepts nested context with string, number, boolean, null, array and object", () => {
    const context = {
      a: "text",
      b: 42,
      c: true,
      d: null,
      e: [1, "two", false, null, { nested: "value" }],
      f: { inner: { deeper: 1 } },
    };
    expect(DuelEventSchema.safeParse(baseEvent({ context })).success).toBe(true);
  });

  it("rejects context with an undefined value", () => {
    expect(DuelEventSchema.safeParse(baseEvent({ context: { a: undefined } })).success).toBe(
      false,
    );
  });
});

describe("ZoneReferenceSchema", () => {
  it("rejects index 5", () => {
    expect(
      ZoneReferenceSchema.safeParse({ player: "P1", zoneType: "monster", index: 5 }).success,
    ).toBe(false);
  });

  it("accepts index 0 and index 4", () => {
    expect(
      ZoneReferenceSchema.safeParse({ player: "P1", zoneType: "monster", index: 0 }).success,
    ).toBe(true);
    expect(
      ZoneReferenceSchema.safeParse({ player: "P2", zoneType: "spell", index: 4 }).success,
    ).toBe(true);
  });
});
