import type { ConsolidatedRating, DuelOutcome } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { consolidateDuelResult } from "./consolidate-duel-result.ts";

const rating: ConsolidatedRating = {
  source: "rating_engine",
  grade: "B-TEC",
  reward: { stars: 17, dropTier: "opaque-tier" },
};

describe("consolidateDuelResult", () => {
  it("maps a P1 winner to victory and preserves the opaque rating", () => {
    expect(
      consolidateDuelResult({
        duelSessionId: "duel-1",
        outcome: {
          status: "decisive",
          winner: "P1",
          loser: "P2",
          reason: "lp_depleted",
        },
        rating,
      }),
    ).toEqual({
      status: "victory",
      duelSessionId: "duel-1",
      reason: "lp_depleted",
      rating,
    });
  });

  it("maps a P1 loser to defeat without rating", () => {
    expect(
      consolidateDuelResult({
        duelSessionId: "duel-1",
        outcome: {
          status: "decisive",
          winner: "P2",
          loser: "P1",
          reason: "surrender",
        },
        rating: null,
      }),
    ).toEqual({
      status: "defeat",
      duelSessionId: "duel-1",
      reason: "surrender",
    });
  });

  it("maps a draw without rating", () => {
    expect(
      consolidateDuelResult({
        duelSessionId: "duel-1",
        outcome: { status: "draw", winner: null, loser: null, reason: "draw" },
        rating: null,
      }),
    ).toEqual({
      status: "draw",
      duelSessionId: "duel-1",
      reason: "draw",
    });
  });

  it("rejects a decisive outcome unrelated to P1", () => {
    const invalidOutcome = {
      status: "decisive",
      winner: "P2",
      loser: "P2",
      reason: "deck_out",
    } as DuelOutcome;
    expect(
      consolidateDuelResult({
        duelSessionId: "duel-1",
        outcome: invalidOutcome,
        rating: null,
      }),
    ).toEqual({
      status: "unavailable",
      duelSessionId: "duel-1",
      reason: "invalid_outcome",
    });
  });

  it("never exposes rating data for defeat or draw", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.oneof(
          fc.constant<DuelOutcome>({
            status: "decisive",
            winner: "P2",
            loser: "P1",
            reason: "deck_out",
          }),
          fc.constant<DuelOutcome>({
            status: "draw",
            winner: null,
            loser: null,
            reason: "draw",
          }),
        ),
        (duelSessionId, outcome) => {
          const result = consolidateDuelResult({ duelSessionId, outcome, rating: null });
          expect(result.status === "defeat" || result.status === "draw").toBe(true);
          expect("rating" in result).toBe(false);
        },
      ),
    );
  });
});

