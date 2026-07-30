// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { ok, type ConsolidatedDuelResult } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { useCardDropReward } from "./use-card-drop-reward.ts";

const victory: Extract<ConsolidatedDuelResult, { status: "victory" }> = {
  status: "victory",
  duelSessionId: "session-1",
  reason: "lp_zerado",
  rating: { source: "rating_engine", grade: "A", reward: { stars: 10, dropTier: "common" } },
};

const defeat: ConsolidatedDuelResult = {
  status: "defeat",
  duelSessionId: "session-1",
  reason: "rendicao",
};

const draw: ConsolidatedDuelResult = {
  status: "draw",
  duelSessionId: "session-1",
  reason: "empate",
};

const unavailable: ConsolidatedDuelResult = {
  status: "unavailable",
  duelSessionId: "session-1",
  reason: "missing_outcome",
};

describe("useCardDropReward", () => {
  it("does not call grantCardDrop for a defeat result", () => {
    const grantReward = vi.fn();
    renderHook(() => useCardDropReward(defeat, grantReward));

    expect(grantReward).not.toHaveBeenCalled();
  });

  it("does not call grantCardDrop for a draw result", () => {
    const grantReward = vi.fn();
    renderHook(() => useCardDropReward(draw, grantReward));

    expect(grantReward).not.toHaveBeenCalled();
  });

  it("does not call grantCardDrop for an unavailable result", () => {
    const grantReward = vi.fn();
    renderHook(() => useCardDropReward(unavailable, grantReward));

    expect(grantReward).not.toHaveBeenCalled();
  });

  it("calls grantCardDrop exactly once for a victory result", async () => {
    const grantReward = vi.fn(async () =>
      ok({
        outcome: { cardNumber: "001" as const, source: "duelist_pool" as const, tier: "common" },
        reward: { status: "applied" as const, currentQuantity: 1 },
      }),
    );

    const { result } = renderHook(() => useCardDropReward(victory, grantReward));

    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(grantReward).toHaveBeenCalledTimes(1);
    expect(grantReward).toHaveBeenCalledWith(victory);
  });
});
