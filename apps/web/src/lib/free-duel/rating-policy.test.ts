import { describe, expect, it } from "vitest";
import type { DuelState } from "@yugioh/shared";
import {
  MINIMUM_RATING_REWARD,
  ratingEngine,
  readDuelOutcome,
  unavailableRatingEngine,
} from "./rating-policy.ts";
import { emptyDuelStatsByPlayer } from "@yugioh/engine";

const baseState = {
  players: {} as DuelState["players"],
  activeField: null,
  activePlayer: "P1",
  turn: 1,
  phase: "main",
  seed: 1,
  stats: emptyDuelStatsByPlayer(),
} satisfies DuelState;

describe("rating policy", () => {
  it("reads the outcome from an ended state", () => {
    const outcome = { status: "decisive", winner: "P1", loser: "P2", reason: "lp_depleted" } as const;
    const result = readDuelOutcome({ ...baseState, outcome });

    expect(result).toEqual({ ok: true, value: outcome });
  });

  it("fails when the duel has not ended", () => {
    const result = readDuelOutcome(baseState);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duel_outcome_missing");
  });

  it("keeps the rating engine unavailable behind the minimum fallback", async () => {
    const result = await unavailableRatingEngine.evaluate(baseState, "P1");

    expect(MINIMUM_RATING_REWARD).toEqual({ stars: 0, dropTier: "common" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("rating_engine_unavailable");
  });
});

describe("the real rating engine adapter", () => {
  const emptyField = {
    monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
    spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  };

  function endedState(overrides: Partial<DuelState> = {}): DuelState {
    return {
      ...baseState,
      players: {
        P1: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
        P2: { lp: 0, hand: [], deck: [], field: emptyField, handPlayUsed: false },
      },
      turn: 3,
      outcome: { status: "decisive", winner: "P1", loser: "P2", reason: "lp_depleted" },
      ...overrides,
    };
  }

  it("grades a real victory instead of always failing", async () => {
    const result = await ratingEngine.evaluate(endedState(), "P1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reward.stars).toBeGreaterThanOrEqual(1);
  });

  it("no longer sends every victory to the minimum fallback", async () => {
    const result = await ratingEngine.evaluate(endedState(), "P1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reward).not.toEqual(MINIMUM_RATING_REWARD);
  });

  it("refuses to grade the losing player", async () => {
    const result = await ratingEngine.evaluate(endedState(), "P2");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duel_not_won_by_player");
  });

  it("keeps the minimum fallback as a failure policy, not a normal outcome", () => {
    expect(MINIMUM_RATING_REWARD).toEqual({ stars: 0, dropTier: "common" });
  });
});
