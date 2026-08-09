import { describe, expect, it } from "vitest";

import type { Card } from "../card/types.ts";
import { DUEL_STAT_COUNTERS, EVENT_TYPES, INITIAL_LP } from "./constants.ts";
import {
  DuelEventSchema,
  DuelStateSchema,
  DuelStatsSchema,
  ZoneReferenceSchema,
} from "./schema.ts";
import type { DuelStats } from "./stats.ts";
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
    handPlayUsed: false,
    ...overrides,
  };
}

function zeroStats(overrides: Partial<DuelStats> = {}): DuelStats {
  return {
    effectiveAttacks: 0,
    defensiveVictories: 0,
    faceDownPlays: 0,
    fusions: 0,
    equips: 0,
    pureMagics: 0,
    triggeredTraps: 0,
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
    stats: { P1: zeroStats(), P2: zeroStats() },
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
            equips: [],
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
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects an empty monster zone with hasAttacked present", () => {
    const state = stateWithP1Field({
      monsters: [
        { occupied: false, hasAttacked: false },
        emptyZone,
        emptyZone,
        emptyZone,
        emptyZone,
      ],
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
    expect(DuelEventSchema.safeParse(baseEvent({ context: { a: undefined } })).success).toBe(false);
  });
});

describe("MonsterZoneSchema equips", () => {
  function occupiedZone(equips: unknown) {
    return {
      occupied: true,
      card: validCard(),
      position: "attack_face_up",
      hasAttacked: false,
      hasChangedPosition: false,
      ...(equips === undefined ? {} : { equips }),
    };
  }

  it("exige equips na variante ocupada", () => {
    const state = stateWithP1Field({
      monsters: [occupiedZone(undefined), emptyZone, emptyZone, emptyZone, emptyZone],
      spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    });
    expect(DuelStateSchema.safeParse(state).success).toBe(false);
  });

  it("aceita uma zona ocupada com equips vazio e com equipamentos anexados", () => {
    for (const equips of [[], [validCard({ numero: "301", tipo: "equipamento" })]]) {
      const state = stateWithP1Field({
        monsters: [occupiedZone(equips), emptyZone, emptyZone, emptyZone, emptyZone],
        spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
      });
      expect(DuelStateSchema.safeParse(state).success).toBe(true);
    }
  });
});

describe("DuelStateSchema attackLocks", () => {
  it("aceita um estado sem attackLocks e um com bloqueio para os dois jogadores", () => {
    expect(DuelStateSchema.safeParse(validState()).success).toBe(true);
    expect(
      DuelStateSchema.safeParse({
        ...validState(),
        attackLocks: [
          { player: "P1", untilTurn: 7 },
          { player: "P2", untilTurn: 9 },
        ],
      }).success,
    ).toBe(true);
  });

  it("recusa dois bloqueios para o mesmo jogador", () => {
    expect(
      DuelStateSchema.safeParse({
        ...validState(),
        attackLocks: [
          { player: "P1", untilTurn: 7 },
          { player: "P1", untilTurn: 9 },
        ],
      }).success,
    ).toBe(false);
  });

  it("recusa untilTurn menor que 1 e campo extra no bloqueio", () => {
    expect(
      DuelStateSchema.safeParse({ ...validState(), attackLocks: [{ player: "P1", untilTurn: 0 }] })
        .success,
    ).toBe(false);
    expect(
      DuelStateSchema.safeParse({
        ...validState(),
        attackLocks: [{ player: "P1", untilTurn: 7, extra: true }],
      }).success,
    ).toBe(false);
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

describe("DuelStatsSchema (rating-engine F01)", () => {
  it("accepts the zeroed counters", () => {
    expect(DuelStatsSchema.safeParse(zeroStats()).success).toBe(true);
  });

  it("rejects a negative counter", () => {
    expect(DuelStatsSchema.safeParse(zeroStats({ fusions: -1 })).success).toBe(false);
  });

  it("rejects a fractional counter", () => {
    expect(DuelStatsSchema.safeParse(zeroStats({ effectiveAttacks: 1.5 })).success).toBe(false);
  });

  it("rejects an unknown counter key", () => {
    expect(DuelStatsSchema.safeParse({ ...zeroStats(), ritualSummons: 0 }).success).toBe(false);
  });

  it("rejects a missing counter", () => {
    const incomplete = Object.fromEntries(
      Object.entries(zeroStats()).filter(([counter]) => counter !== "triggeredTraps"),
    );

    expect(DuelStatsSchema.safeParse(incomplete).success).toBe(false);
  });

  it("covers exactly the seven counters of DUEL_STAT_COUNTERS", () => {
    expect(Object.keys(zeroStats())).toEqual([...DUEL_STAT_COUNTERS]);
    expect(DUEL_STAT_COUNTERS).toHaveLength(7);
  });

  it("rejects a state without stats", () => {
    const stateWithoutStats = Object.fromEntries(
      Object.entries(validState()).filter(([key]) => key !== "stats"),
    );

    expect(DuelStateSchema.safeParse(stateWithoutStats).success).toBe(false);
  });

  it("accepts a state whose counters have grown", () => {
    const state = validState({
      stats: { P1: zeroStats({ fusions: 3, equips: 12 }), P2: zeroStats({ pureMagics: 40 }) },
    });

    expect(DuelStateSchema.safeParse(state).success).toBe(true);
  });
});
