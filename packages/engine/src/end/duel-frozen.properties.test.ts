import type { Action, DuelOutcome, DuelState, PlayerField, PlayerState } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { apply } from "../turn/apply.ts";
import { checkDuelEnd } from "./check-duel-end.ts";
import { stampOutcome } from "./stamp-outcome.ts";
import { emptyDuelStatsByPlayer } from "../stats/empty-stats.ts";

const playerIdArbitrary = fc.constantFrom("P1" as const, "P2" as const);
const zoneIndexArbitrary = fc.constantFrom(0, 1, 2, 3, 4).map((i) => i as 0 | 1 | 2 | 3 | 4);

/** One of every variant of the closed `Action` union — what "any action" means below. */
const actionArbitrary: fc.Arbitrary<Action> = fc.oneof(
  fc.constant<Action>({ type: "advance_phase" }),
  fc.record({
    type: fc.constant("summon_monster" as const),
    player: playerIdArbitrary,
    handIndex: fc.integer({ min: 0, max: 4 }),
    zoneIndex: zoneIndexArbitrary,
    position: fc.constantFrom(
      "attack_face_up" as const,
      "attack_face_down" as const,
      "defense_face_up" as const,
      "defense_face_down" as const,
    ),
  }),
  fc.record({
    type: fc.constant("play_spell_or_trap" as const),
    handIndex: fc.integer({ min: 0, max: 4 }),
    zoneIndex: zoneIndexArbitrary,
  }),
  fc.record({
    type: fc.constant("play_field_spell" as const),
    handIndex: fc.integer({ min: 0, max: 4 }),
  }),
  fc.record({
    type: fc.constant("change_position" as const),
    zone: fc.record({
      player: playerIdArbitrary,
      zoneType: fc.constant("monster" as const),
      index: zoneIndexArbitrary,
    }),
  }),
  fc.record({
    type: fc.constant("declare_attack" as const),
    attackerZoneIndex: zoneIndexArbitrary,
  }),
  fc.constant<Action>({ type: "resolve_attack" }),
  fc.record({ type: fc.constant("surrender" as const), player: playerIdArbitrary }),
);

const outcomeArbitrary: fc.Arbitrary<DuelOutcome> = fc.oneof(
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
  fc.constant<DuelOutcome>({ status: "draw", winner: null, loser: null, reason: "draw" }),
);

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

const stateArbitrary = fc.record({
  p1Lp: fc.integer({ min: 0, max: 8000 }),
  p2Lp: fc.integer({ min: 0, max: 8000 }),
  activePlayer: playerIdArbitrary,
  turn: fc.integer({ min: 1, max: 40 }),
  phase: fc.constantFrom("draw" as const, "main" as const, "battle" as const, "end" as const),
  deckOutPlayer: fc.option(playerIdArbitrary, { nil: undefined }),
});

function buildState(
  parts: {
    p1Lp: number;
    p2Lp: number;
    activePlayer: "P1" | "P2";
    turn: number;
    phase: DuelState["phase"];
    deckOutPlayer: "P1" | "P2" | undefined;
  },
  outcome?: DuelOutcome,
): DuelState {
  return {
    players: { P1: makePlayer(parts.p1Lp), P2: makePlayer(parts.p2Lp) },
    activeField: null,
    activePlayer: parts.activePlayer,
    turn: parts.turn,
    phase: parts.phase,
    seed: 1,
    stats: emptyDuelStatsByPlayer(),
    ...(parts.deckOutPlayer === undefined ? {} : { deckOutPlayer: parts.deckOutPlayer }),
    ...(outcome === undefined ? {} : { outcome }),
  };
}

describe("frozen duel", () => {
  it("refuses any action and leaves the state unchanged when outcome is already set", () => {
    fc.assert(
      fc.property(stateArbitrary, outcomeArbitrary, actionArbitrary, (parts, outcome, action) => {
        const state = buildState(parts, outcome);
        const before = structuredClone(state);

        const result = apply(state, action);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("duel_already_ended");
        expect(state).toEqual(before);
      }),
    );
  });
});

describe("stampOutcome", () => {
  it("is idempotent", () => {
    fc.assert(
      fc.property(stateArbitrary, (parts) => {
        const once = stampOutcome({ state: buildState(parts), events: [] });
        const twice = stampOutcome(once);

        expect(twice).toEqual(once);
      }),
    );
  });

  it("never overwrites an existing outcome", () => {
    fc.assert(
      fc.property(stateArbitrary, outcomeArbitrary, (parts, outcome) => {
        const stamped = stampOutcome({ state: buildState(parts, outcome), events: [] });

        expect(stamped.state.outcome).toEqual(outcome);
      }),
    );
  });
});

describe("checkDuelEnd", () => {
  it("is total and never declares the same player as winner and loser", () => {
    fc.assert(
      fc.property(stateArbitrary, (parts) => {
        const outcome = checkDuelEnd(buildState(parts));

        if (outcome === undefined) return;
        expect(outcome.winner).not.toBe(outcome.loser);
      }),
    );
  });

  it("declares an ending exactly when LP is depleted or deck-out is flagged", () => {
    fc.assert(
      fc.property(stateArbitrary, (parts) => {
        const shouldEnd =
          parts.p1Lp === 0 || parts.p2Lp === 0 || parts.deckOutPlayer !== undefined;

        expect(checkDuelEnd(buildState(parts)) !== undefined).toBe(shouldEnd);
      }),
    );
  });
});
