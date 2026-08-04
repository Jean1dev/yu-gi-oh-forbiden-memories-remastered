import {
  CARD_ATTRIBUTES,
  CARD_TYPES,
  EVENT_TYPES,
  GUARDIAN_STARS,
  MAX_MONSTER_LEVEL,
  MIN_MONSTER_LEVEL,
  type MonsterPosition,
  type MonsterZone,
  type PlayerId,
  type SpellZone,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { load } from "./load.ts";
import { serialize } from "./serialize.ts";

const playerIdArbitrary = fc.constantFrom<PlayerId>("P1", "P2");

const monsterPositions: readonly MonsterPosition[] = [
  "attack_face_up",
  "attack_face_down",
  "defense_face_up",
  "defense_face_down",
];

const cardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  numero: fc.integer({ min: 1, max: 999 }).map((n) => String(n).padStart(3, "0")),
  nome: fc.string({ minLength: 1, maxLength: 20 }),
  img: fc.constant(null),
  classe: fc.string({ minLength: 1, maxLength: 20 }),
  atk: fc.option(fc.integer({ min: 0, max: 999999 }), { nil: null }),
  def: fc.option(fc.integer({ min: 0, max: 999999 }), { nil: null }),
  guardiao1: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  guardiao2: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  password: fc.constant(null),
  estrelas: fc.option(fc.integer({ min: 0, max: 999999 }), { nil: null }),
  tipo: fc.constantFrom(...CARD_TYPES),
  atributo: fc.option(fc.constantFrom(...CARD_ATTRIBUTES), { nil: null }),
  nivel: fc.option(fc.integer({ min: MIN_MONSTER_LEVEL, max: MAX_MONSTER_LEVEL }), { nil: null }),
  descricao: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
}).map((card) => (card.tipo === "monstro" ? card : { ...card, nivel: null }));

const emptyMonsterZone: MonsterZone = { occupied: false };
const emptySpellZone: SpellZone = { occupied: false };

const monsterZoneArbitrary = fc.oneof(
  fc.constant(emptyMonsterZone),
  fc.record({
    occupied: fc.constant(true as const),
    card: cardArbitrary,
    position: fc.constantFrom(...monsterPositions),
    hasAttacked: fc.boolean(),
    hasChangedPosition: fc.boolean(),
  }),
);

const spellZoneArbitrary = fc.oneof(
  fc.constant(emptySpellZone),
  fc.record({ occupied: fc.constant(true as const), card: cardArbitrary, faceUp: fc.boolean() }),
);

const playerFieldArbitrary = fc.record({
  monsters: fc.tuple(
    monsterZoneArbitrary,
    monsterZoneArbitrary,
    monsterZoneArbitrary,
    monsterZoneArbitrary,
    monsterZoneArbitrary,
  ),
  spells: fc.tuple(
    spellZoneArbitrary,
    spellZoneArbitrary,
    spellZoneArbitrary,
    spellZoneArbitrary,
    spellZoneArbitrary,
  ),
});

const playerStateArbitrary = fc.record({
  lp: fc.integer({ min: 0, max: 8000 }),
  hand: fc.array(cardArbitrary, { maxLength: 5 }),
  deck: fc.array(cardArbitrary, { maxLength: 40 }),
  field: playerFieldArbitrary,
  handPlayUsed: fc.boolean(),
});

const zoneReferenceArbitrary = fc.record({
  player: playerIdArbitrary,
  zoneType: fc.constantFrom("monster", "spell"),
  index: fc.constantFrom(0, 1, 2, 3, 4),
});

const contextKeyArbitrary = fc.string().filter((key) => key !== "__proto__");

const contextArbitrary = fc.dictionary(
  contextKeyArbitrary,
  fc.oneof(fc.string(), fc.integer(), fc.boolean()),
);

const duelEventArbitrary = fc.record({
  type: fc.constantFrom(...EVENT_TYPES),
  originPlayer: playerIdArbitrary,
  involvedCards: fc.array(cardArbitrary, { maxLength: 3 }),
  involvedZones: fc.array(zoneReferenceArbitrary, { maxLength: 3 }),
  context: contextArbitrary,
});

const reactionWindowArbitrary = fc.record({
  type: fc.constant("reaction_window" as const),
  event: duelEventArbitrary,
  reactingPlayer: playerIdArbitrary,
});

/**
 * Covers the full variety of shapes `DuelState` can take (spec Decision 7):
 * empty and occupied zones in all 4 monster positions, a partial or full
 * field, with and without an active field spell, with and without `pending`
 * (`requiredKeys` below omits it in roughly half the generated cases instead
 * of always setting it to `undefined`), turn 1 and arbitrary later turns.
 */
/** Every way a duel can be frozen (motor-duelo-1x1 F12) — all four reasons. */
const outcomeArbitrary = fc.oneof(
  fc
    .record({
      loser: playerIdArbitrary,
      reason: fc.constantFrom("lp_depleted" as const, "deck_out" as const, "surrender" as const),
    })
    .map(({ loser, reason }) => ({
      status: "decisive" as const,
      winner: loser === "P1" ? ("P2" as const) : ("P1" as const),
      loser,
      reason,
    })),
  fc.constant({ status: "draw" as const, winner: null, loser: null, reason: "draw" as const }),
);

const duelStateArbitrary = fc.record(
  {
    players: fc.record({ P1: playerStateArbitrary, P2: playerStateArbitrary }),
    activeField: fc.option(cardArbitrary, { nil: null }),
    activePlayer: playerIdArbitrary,
    turn: fc.integer({ min: 1, max: 999 }),
    phase: fc.constantFrom("draw", "main", "battle", "end"),
    seed: fc.integer({ min: 0, max: 0xffffffff }),
    pending: reactionWindowArbitrary,
    deckOutPlayer: playerIdArbitrary,
    outcome: outcomeArbitrary,
  },
  { requiredKeys: ["players", "activeField", "activePlayer", "turn", "phase", "seed"] },
);

describe("round-trip idempotency (motor-duelo-1x1 F05, critério de aceite 1)", () => {
  it("load(serialize(state)) always succeeds and is structurally identical to state", () => {
    fc.assert(
      fc.property(duelStateArbitrary, (state) => {
        const result = load(serialize(state));

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("expected ok");
        expect(result.value).toEqual(state);
      }),
      { numRuns: 1000 },
    );
  }, 15_000);
});

describe("reference independence", () => {
  it("no nested object of serialize(state) shares reference identity with state", () => {
    fc.assert(
      fc.property(duelStateArbitrary, (state) => {
        const snapshot = serialize(state);

        expect(snapshot).not.toBe(state);
        expect(snapshot.players).not.toBe(state.players);
        expect(snapshot.players.P1).not.toBe(state.players.P1);
        expect(snapshot.players.P2).not.toBe(state.players.P2);
        expect(snapshot.players.P1.field).not.toBe(state.players.P1.field);
        expect(snapshot.players.P1.hand).not.toBe(state.players.P1.hand);
        expect(snapshot.players.P1.deck).not.toBe(state.players.P1.deck);
        if (state.activeField !== null) {
          expect(snapshot.activeField).not.toBe(state.activeField);
        }
      }),
      { numRuns: 1000 },
    );
  }, 15_000);
});
