import { DomainError, err, ok, type PendingVictoryReward } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { loadWalletBalance, type LoadWalletBalanceDeps } from "./load-wallet.ts";

const clock = { now: () => new Date("2026-07-30T00:00:00.000Z") };
const reward: PendingVictoryReward = {
  duelId: "duel-1",
  playerId: "player",
  cardNumber: "001",
  stars: 5,
  queuedAt: "2026-07-29T00:00:00.000Z",
};

function deps(overrides: Partial<LoadWalletBalanceDeps> = {}): LoadWalletBalanceDeps {
  return {
    playerId: "player",
    repository: { load: async () => ok({ playerId: "player", stars: 12 }) },
    cache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
    queue: {
      enqueueReward: async () => undefined,
      listPendingRewards: async () => [],
      removePendingReward: async () => undefined,
    },
    appliedRewards: { listApplied: async () => ok(new Set()) },
    clock,
    ...overrides,
  };
}

describe("loadWalletBalance", () => {
  it("returns the server balance and writes the effective balance to cache", async () => {
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const result = await loadWalletBalance(deps({ cache: { loadSnapshot: async () => undefined, saveSnapshot } }));

    expect(result).toEqual(ok({
      origin: "server", stars: 12, effectiveStars: 12, pendingStars: 0, pendingDuelIds: [],
      syncedAt: "2026-07-30T00:00:00.000Z",
    }));
    expect(saveSnapshot).toHaveBeenCalledWith({ playerId: "player", stars: 12, syncedAt: "2026-07-30T00:00:00.000Z" });
  });

  it("does not query the ledger when the pending queue is empty", async () => {
    const listApplied = vi.fn();
    await loadWalletBalance(deps({ appliedRewards: { listApplied } }));
    expect(listApplied).not.toHaveBeenCalled();
  });

  it("adds unsynced offline credits to the effective balance", async () => {
    const result = await loadWalletBalance(deps({ queue: { enqueueReward: async () => undefined, listPendingRewards: async () => [reward], removePendingReward: async () => undefined } }));
    expect(result.ok && result.value).toMatchObject({ effectiveStars: 17, pendingStars: 5, pendingDuelIds: ["duel-1"] });
  });

  it("treats an unreachable ledger as fully applied and never inflates the balance", async () => {
    const result = await loadWalletBalance(deps({
      queue: { enqueueReward: async () => undefined, listPendingRewards: async () => [reward], removePendingReward: async () => undefined },
      appliedRewards: { listApplied: async () => err(new DomainError("offline", "wallet_unavailable")) },
    }));
    expect(result.ok && result.value.effectiveStars).toBe(12);
  });

  it("treats an unavailable IndexedDB queue as empty", async () => {
    const result = await loadWalletBalance(deps({ queue: { enqueueReward: async () => undefined, listPendingRewards: async () => { throw new Error("unavailable"); }, removePendingReward: async () => undefined } }));
    expect(result.ok && result.value.effectiveStars).toBe(12);
  });

  it("falls back to the cached balance without adding the queue again", async () => {
    const result = await loadWalletBalance(deps({
      repository: { load: async () => err(new DomainError("offline", "wallet_unavailable")) },
      cache: { loadSnapshot: async () => ({ playerId: "player", stars: 17, syncedAt: "earlier" }), saveSnapshot: async () => undefined },
      queue: { enqueueReward: async () => undefined, listPendingRewards: async () => [reward], removePendingReward: async () => undefined },
    }));
    expect(result).toEqual(ok({ origin: "cache", stars: 17, effectiveStars: 17, pendingStars: 0, pendingDuelIds: [], syncedAt: "earlier" }));
  });

  it("returns wallet_unavailable when both the server and the cache fail", async () => {
    const result = await loadWalletBalance(deps({
      repository: { load: async () => err(new DomainError("offline", "wallet_unavailable")) },
    }));
    expect(!result.ok && result.error.code).toBe("wallet_unavailable");
  });

  it("returns session_missing without any read when there is no player id", async () => {
    const load = vi.fn();
    const result = await loadWalletBalance(deps({ playerId: undefined, repository: { load } }));
    expect(!result.ok && result.error.code).toBe("session_missing");
    expect(load).not.toHaveBeenCalled();
  });
});
