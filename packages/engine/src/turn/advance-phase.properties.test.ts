import {
  CARD_TYPES,
  DUEL_STAT_COUNTERS,
  GUARDIAN_STARS,
  type DuelState,
  type MonsterZone,
  type Phase,
  type PlayerField,
  type PlayerId,
  type PlayerState,
  type SpellZone,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { advancePhase } from "./advance-phase.ts";

const cardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  numero: fc.integer({ min: 1, max: 999 }).map((n) => String(n).padStart(3, "0")),
  nome: fc.string({ minLength: 1, maxLength: 20 }),
  img: fc.constant(null),
  classe: fc.string({ minLength: 1, maxLength: 20 }),
  atk: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null }),
  def: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null }),
  guardiao1: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  guardiao2: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  password: fc.constant(null),
  estrelas: fc.option(fc.integer({ min: 0, max: 12 }), { nil: null }),
  tipo: fc.constantFrom(...CARD_TYPES),
});

const emptyMonsterZone: MonsterZone = { occupied: false };
const emptySpellZone: SpellZone = { occupied: false };

const monsterZoneArbitrary = fc.oneof(
  fc.constant(emptyMonsterZone),
  fc.record({
    occupied: fc.constant(true as const),
    card: cardArbitrary,
    position: fc.constantFrom(
      "attack_face_up" as const,
      "attack_face_down" as const,
      "defense_face_up" as const,
      "defense_face_down" as const,
    ),
    hasAttacked: fc.boolean(),
    hasChangedPosition: fc.boolean(),
    equips: fc.array(cardArbitrary, { maxLength: 2 }),
  }),
);

const spellZoneArbitrary = fc.oneof(
  fc.constant(emptySpellZone),
  fc.record({ occupied: fc.constant(true as const), card: cardArbitrary, faceUp: fc.boolean() }),
);

const playerFieldArbitrary: fc.Arbitrary<PlayerField> = fc.record({
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

const playerStateArbitrary: fc.Arbitrary<PlayerState> = fc.record({
  lp: fc.integer({ min: 0, max: 8000 }),
  hand: fc.array(cardArbitrary, { maxLength: 5 }),
  deck: fc.array(cardArbitrary, { maxLength: 40 }),
  field: playerFieldArbitrary,
  handPlayUsed: fc.boolean(),
});

const phaseArbitrary = fc.constantFrom<Phase>("draw", "main", "battle", "end");
const playerIdArbitrary = fc.constantFrom<PlayerId>("P1", "P2");

/** Arbitrary duel counters (rating-engine F01), derived from the vocabulary. */
const duelStatsArbitrary = fc.record(
  Object.fromEntries(
    DUEL_STAT_COUNTERS.map((counter) => [counter, fc.integer({ min: 0, max: 999 })]),
  ) as Record<(typeof DUEL_STAT_COUNTERS)[number], fc.Arbitrary<number>>,
);

const duelStateArbitrary: fc.Arbitrary<DuelState> = fc.record({
  players: fc.record({ P1: playerStateArbitrary, P2: playerStateArbitrary }),
  activeField: fc.option(cardArbitrary, { nil: null }),
  activePlayer: playerIdArbitrary,
  turn: fc.integer({ min: 1, max: 50 }),
  phase: phaseArbitrary,
  seed: fc.integer({ min: 0, max: 0xffffffff }),
  stats: fc.record({ P1: duelStatsArbitrary, P2: duelStatsArbitrary }),
});

const CYCLE: readonly Phase[] = ["draw", "main", "battle", "end"];

describe("advancePhase properties", () => {
  it("a fase avança sempre no ciclo draw→main→battle→end e o turno nunca decresce", () => {
    fc.assert(
      fc.property(duelStateArbitrary, fc.integer({ min: 1, max: 20 }), (initial, steps) => {
        let state = initial;
        let previousTurn = state.turn;

        for (let i = 0; i < steps; i++) {
          const before = state.phase;
          const result = advancePhase(state);
          const expectedNext = CYCLE[(CYCLE.indexOf(before) + 1) % CYCLE.length];

          expect(result.state.phase).toBe(expectedNext);
          expect(result.state.turn).toBeGreaterThanOrEqual(previousTurn);

          previousTurn = result.state.turn;
          state = result.state;
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("repetir a mesma sequência a partir do mesmo estado inicial produz sempre o mesmo estado final", () => {
    fc.assert(
      fc.property(duelStateArbitrary, fc.integer({ min: 1, max: 10 }), (initial, steps) => {
        function run(): DuelState {
          let current = initial;
          for (let i = 0; i < steps; i++) {
            current = advancePhase(current).state;
          }
          return current;
        }

        expect(run()).toEqual(run());
      }),
      { numRuns: 1000 },
    );
  });

  it("preserva lp, hand, deck, activeField e seed em transições que não fecham o turno nem compram (main→battle, battle→end)", () => {
    fc.assert(
      fc.property(
        duelStateArbitrary.filter((state) => state.phase !== "end" && state.phase !== "draw"),
        (initial) => {
          const result = advancePhase(initial);

          expect(result.state.players.P1.lp).toBe(initial.players.P1.lp);
          expect(result.state.players.P2.lp).toBe(initial.players.P2.lp);
          expect(result.state.players.P1.hand).toEqual(initial.players.P1.hand);
          expect(result.state.players.P2.hand).toEqual(initial.players.P2.hand);
          expect(result.state.players.P1.deck).toEqual(initial.players.P1.deck);
          expect(result.state.players.P2.deck).toEqual(initial.players.P2.deck);
          expect(result.state.activeField).toEqual(initial.activeField);
          expect(result.state.seed).toBe(initial.seed);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
