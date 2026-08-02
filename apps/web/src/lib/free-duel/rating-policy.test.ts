import { describe, expect, it } from "vitest";
import type { DuelState } from "@yugioh/shared";
import {
  MINIMUM_RATING_REWARD,
  readDuelOutcome,
  unavailableRatingEngine,
} from "./rating-policy.ts";

const baseState = {
  players: {} as DuelState["players"],
  activeField: null,
  activePlayer: "P1",
  turn: 1,
  phase: "main",
  seed: 1,
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
    const result = await unavailableRatingEngine.evaluate(baseState);

    expect(MINIMUM_RATING_REWARD).toEqual({ stars: 0, dropTier: "common" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("rating_engine_unavailable");
  });
});
