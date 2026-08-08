// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { ok, type ConsolidatedDuelResult } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { useVictoryReward } from "./use-victory-reward.ts";

const victory: ConsolidatedDuelResult = {
  status: "victory",
  duelSessionId: "session",
  reason: "lp_depleted",
  rating: { source: "rating_engine", grade: "A-POW", reward: { stars: 4, dropTier: "sa-pow" } },
};

describe("useVictoryReward", () => {
  it.each(["defeat", "draw", "unavailable"] as const)("does not grant for %s", (status) => {
    const grant = vi.fn();
    const nonVictory = {
      status,
      duelSessionId: "session",
      reason: status === "defeat" ? "surrender" : status === "draw" ? "draw" : "missing_outcome",
    } as ConsolidatedDuelResult;
    renderHook(() => useVictoryReward(nonVictory, grant));
    expect(grant).not.toHaveBeenCalled();
  });

  it("grants exactly once for victory", async () => {
    const grant = vi.fn(async () =>
      ok({
        outcome: { cardNumber: "001" as const, tier: "common" as const, source: "duelist_pool" as const },
        reward: { status: "applied" as const, cardQuantity: 1, walletStars: 4 },
      }),
    );
    const { result } = renderHook(() => useVictoryReward(victory, grant));
    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(grant).toHaveBeenCalledTimes(1);
  });
});
