import type { PendingVictoryReward } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { reconcileWalletBalance } from "./reconcile-balance.ts";

function pendingReward(overrides: Partial<PendingVictoryReward> = {}): PendingVictoryReward {
  return {
    duelId: "duel-1",
    playerId: "player-1",
    cardNumber: "001",
    stars: 10,
    queuedAt: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("reconcileWalletBalance", () => {
  it("returns the persisted balance unchanged when the queue is empty", () => {
    const result = reconcileWalletBalance({
      origin: "server",
      persistedStars: 100,
      pending: [],
      appliedDuelIds: new Set(),
    });
    expect(result).toEqual({
      ok: true,
      value: { persistedStars: 100, pendingStars: 0, effectiveStars: 100, pendingDuelIds: [] },
    });
  });

  it("adds only pending credits absent from the applied ledger set", () => {
    const pending = [pendingReward({ duelId: "a", stars: 10 }), pendingReward({ duelId: "b", stars: 20 })];
    const result = reconcileWalletBalance({
      origin: "server",
      persistedStars: 100,
      pending,
      appliedDuelIds: new Set(["a"]),
    });
    expect(result).toEqual({
      ok: true,
      value: { persistedStars: 100, pendingStars: 20, effectiveStars: 120, pendingDuelIds: ["b"] },
    });
  });

  it("ignores a pending credit whose duelId is already in the ledger", () => {
    const pending = [pendingReward({ duelId: "a", stars: 10 })];
    const result = reconcileWalletBalance({
      origin: "server",
      persistedStars: 50,
      pending,
      appliedDuelIds: new Set(["a"]),
    });
    expect(result).toEqual({
      ok: true,
      value: { persistedStars: 50, pendingStars: 0, effectiveStars: 50, pendingDuelIds: [] },
    });
  });

  it("counts a duplicated duelId in the queue exactly once", () => {
    const pending = [
      pendingReward({ duelId: "a", stars: 10, queuedAt: "2026-07-30T00:00:00.000Z" }),
      pendingReward({ duelId: "a", stars: 10, queuedAt: "2026-07-30T00:01:00.000Z" }),
    ];
    const result = reconcileWalletBalance({
      origin: "server",
      persistedStars: 0,
      pending,
      appliedDuelIds: new Set(),
    });
    expect(result).toEqual({
      ok: true,
      value: { persistedStars: 0, pendingStars: 10, effectiveStars: 10, pendingDuelIds: ["a"] },
    });
  });

  it("does not add pending credits when origin is cache", () => {
    const pending = [pendingReward({ duelId: "a", stars: 10 })];
    const result = reconcileWalletBalance({
      origin: "cache",
      persistedStars: 100,
      pending,
      appliedDuelIds: new Set(),
    });
    expect(result).toEqual({
      ok: true,
      value: { persistedStars: 100, pendingStars: 0, effectiveStars: 100, pendingDuelIds: ["a"] },
    });
  });

  it("reports pendingDuelIds ordered by queuedAt", () => {
    const pending = [
      pendingReward({ duelId: "b", stars: 5, queuedAt: "2026-07-30T00:02:00.000Z" }),
      pendingReward({ duelId: "a", stars: 5, queuedAt: "2026-07-30T00:01:00.000Z" }),
    ];
    const result = reconcileWalletBalance({
      origin: "server",
      persistedStars: 0,
      pending,
      appliedDuelIds: new Set(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pendingDuelIds).toEqual(["b", "a"]);
  });

  it("rejects a negative persisted balance with invalid_wallet_balance", () => {
    const result = reconcileWalletBalance({
      origin: "server",
      persistedStars: -1,
      pending: [],
      appliedDuelIds: new Set(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_wallet_balance");
  });

  it("rejects a non-integer persisted balance with invalid_wallet_balance", () => {
    const result = reconcileWalletBalance({
      origin: "server",
      persistedStars: 1.5,
      pending: [],
      appliedDuelIds: new Set(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_wallet_balance");
  });
});
