import {
  DUEL_STAT_COUNTERS,
  type Action,
  type ApplyResult,
  type Card,
  type DuelState,
  type MonsterPosition,
  type MonsterZone,
  type PlayerField,
  type PlayerId,
  type ZoneIndex,
  type ZoneReference,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { accumulateStats } from "./accumulate-stats.ts";
import { emptyDuelStatsByPlayer } from "./empty-stats.ts";

const playerIdArbitrary = fc.constantFrom<PlayerId>("P1", "P2");
const zoneIndexArbitrary = fc.constantFrom<ZoneIndex>(0, 1, 2, 3, 4);
const positionArbitrary = fc.constantFrom<MonsterPosition>(
  "attack_face_up",
  "attack_face_down",
  "defense_face_up",
  "defense_face_down",
);

const cardArbitrary: fc.Arbitrary<Card> = fc.record({
  id: fc.integer({ min: 1, max: 999 }),
  numero: fc.integer({ min: 1, max: 722 }).map((n) => String(n).padStart(3, "0")),
  nome: fc.string({ minLength: 1, maxLength: 12 }),
  img: fc.constant(null),
  classe: fc.constantFrom("Dragon", "Magic", "Warrior"),
  atk: fc.integer({ min: 0, max: 5000 }),
  def: fc.integer({ min: 0, max: 5000 }),
  guardiao1: fc.constantFrom("Sun", "Moon", null),
  guardiao2: fc.constant(null),
  password: fc.constant(null),
  estrelas: fc.constant(null),
  tipo: fc.constantFrom("monstro", "magica", "armadilha", "equipamento"),
});

const zoneReferenceArbitrary: fc.Arbitrary<ZoneReference> = fc.record({
  player: playerIdArbitrary,
  zoneType: fc.constantFrom("monster", "spell"),
  index: zoneIndexArbitrary,
});

const monsterZoneArbitrary: fc.Arbitrary<MonsterZone> = fc.oneof(
  fc.constant<MonsterZone>({ occupied: false }),
  fc.record({
    occupied: fc.constant(true as const),
    card: cardArbitrary,
    position: positionArbitrary,
    hasAttacked: fc.boolean(),
    hasChangedPosition: fc.boolean(),
    equips: fc.constant([]),
  }),
);

const fieldArbitrary: fc.Arbitrary<PlayerField> = fc
  .array(monsterZoneArbitrary, { minLength: 5, maxLength: 5 })
  .map((monsters) => ({
    monsters: monsters as unknown as PlayerField["monsters"],
    spells: [
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
      { occupied: false },
    ] as unknown as PlayerField["spells"],
  }));

const playerStateArbitrary = fc.record({
  lp: fc.integer({ min: 0, max: 8000 }),
  hand: fc.array(cardArbitrary, { maxLength: 5 }),
  deck: fc.array(cardArbitrary, { maxLength: 10 }),
  field: fieldArbitrary,
  handPlayUsed: fc.boolean(),
});

const statsArbitrary = fc.record(
  Object.fromEntries(
    DUEL_STAT_COUNTERS.map((counter) => [counter, fc.integer({ min: 0, max: 500 })]),
  ) as Record<(typeof DUEL_STAT_COUNTERS)[number], fc.Arbitrary<number>>,
);

const stateArbitrary: fc.Arbitrary<DuelState> = fc.record({
  players: fc.record({ P1: playerStateArbitrary, P2: playerStateArbitrary }),
  activeField: fc.constant(null),
  activePlayer: playerIdArbitrary,
  turn: fc.integer({ min: 1, max: 60 }),
  phase: fc.constantFrom("draw", "main", "battle", "end"),
  seed: fc.integer({ min: 0, max: 0xffffffff }),
  stats: fc.record({ P1: statsArbitrary, P2: statsArbitrary }),
});

const actionArbitrary: fc.Arbitrary<Action> = fc.oneof(
  fc.constant<Action>({ type: "advance_phase" }),
  fc.record({
    type: fc.constant("summon_monster" as const),
    player: playerIdArbitrary,
    handIndex: fc.integer({ min: 0, max: 6 }),
    zoneIndex: zoneIndexArbitrary,
    position: positionArbitrary,
  }),
  fc.record({
    type: fc.constant("play_spell_or_trap" as const),
    handIndex: fc.integer({ min: 0, max: 6 }),
    zoneIndex: zoneIndexArbitrary,
  }),
  fc.record({
    type: fc.constant("equip_card" as const),
    handIndex: fc.integer({ min: 0, max: 6 }),
    targetZone: zoneReferenceArbitrary,
  }),
  fc.record({ type: fc.constant("activate_spell" as const), handIndex: fc.integer({ min: 0, max: 6 }) }),
  fc.record({ type: fc.constant("play_field_spell" as const), handIndex: fc.integer({ min: 0, max: 6 }) }),
  fc.record({ type: fc.constant("change_position" as const), zone: zoneReferenceArbitrary }),
  fc.record({
    type: fc.constant("declare_attack" as const),
    attackerZoneIndex: zoneIndexArbitrary,
    targetZoneIndex: zoneIndexArbitrary,
  }),
  fc.constant<Action>({ type: "resolve_attack" }),
  fc.record({
    type: fc.constant("complete_fusion" as const),
    placement: fc.record({
      kind: fc.constant("monster" as const),
      zoneIndex: zoneIndexArbitrary,
      position: positionArbitrary,
    }),
  }),
  fc.record({ type: fc.constant("surrender" as const), player: playerIdArbitrary }),
);

/** The identity result — the accumulator only ever reads it, never depends on it changing. */
function resultFor(state: DuelState): ApplyResult {
  return { state, events: [] };
}

function totalIncrements(before: DuelState["stats"], after: DuelState["stats"]): number {
  return (["P1", "P2"] as const).reduce(
    (sum, player) =>
      sum +
      DUEL_STAT_COUNTERS.reduce(
        (playerSum, counter) => playerSum + (after[player][counter] - before[player][counter]),
        0,
      ),
    0,
  );
}

describe("accumulateStats properties (rating-engine F01)", () => {
  it("never decreases any counter", () => {
    fc.assert(
      fc.property(stateArbitrary, actionArbitrary, (state, action) => {
        const after = accumulateStats(state, action, resultFor(state)).state.stats;

        for (const player of ["P1", "P2"] as const) {
          for (const counter of DUEL_STAT_COUNTERS) {
            expect(after[player][counter]).toBeGreaterThanOrEqual(state.stats[player][counter]);
          }
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("moves at most one counter by at most one per accepted action", () => {
    fc.assert(
      fc.property(stateArbitrary, actionArbitrary, (state, action) => {
        const after = accumulateStats(state, action, resultFor(state)).state.stats;

        expect(totalIncrements(state.stats, after)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 1000 },
    );
  });

  it("never throws for any combination of state and action", () => {
    fc.assert(
      fc.property(stateArbitrary, actionArbitrary, (state, action) => {
        expect(() => accumulateStats(state, action, resultFor(state))).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });

  it("changes nothing but the stats field — instrumenting does not change any rule", () => {
    fc.assert(
      fc.property(stateArbitrary, actionArbitrary, (state, action) => {
        const input = resultFor(state);
        const output = accumulateStats(state, action, input);

        expect(output.events).toBe(input.events);
        expect({ ...output.state, stats: undefined }).toEqual({ ...input.state, stats: undefined });
      }),
      { numRuns: 1000 },
    );
  });

  it("is deterministic for the same inputs", () => {
    fc.assert(
      fc.property(stateArbitrary, actionArbitrary, (state, action) => {
        const first = accumulateStats(state, action, resultFor(state));
        const second = accumulateStats(state, action, resultFor(state));

        expect(first.state.stats).toEqual(second.state.stats);
      }),
      { numRuns: 1000 },
    );
  });

  it("never leaves a counter below zero when starting from the empty stats", () => {
    fc.assert(
      fc.property(stateArbitrary, actionArbitrary, (state, action) => {
        const fresh: DuelState = { ...state, stats: emptyDuelStatsByPlayer() };
        const after = accumulateStats(fresh, action, resultFor(fresh)).state.stats;

        for (const player of ["P1", "P2"] as const) {
          for (const counter of DUEL_STAT_COUNTERS) {
            expect(after[player][counter]).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      { numRuns: 1000 },
    );
  });
});
