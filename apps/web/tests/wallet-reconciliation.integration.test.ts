import { ok, type PendingVictoryReward } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { loadWalletBalance, type LoadWalletBalanceDeps } from "../src/lib/wallet/load-wallet.ts";

const reward: PendingVictoryReward = {
  duelId: "duel-offline", playerId: "player", cardNumber: "001", stars: 5,
  queuedAt: "2026-07-31T00:00:00.000Z",
};

function dependencies(applied: ReadonlySet<string>, pending: readonly PendingVictoryReward[], serverStars: number): LoadWalletBalanceDeps {
  return {
    playerId: "player",
    repository: { load: async () => ok({ playerId: "player", stars: serverStars }) },
    cache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
    queue: { enqueueReward: async () => undefined, listPendingRewards: async () => pending, removePendingReward: async () => undefined },
    appliedRewards: { listApplied: async () => ok(applied) },
    clock: { now: () => new Date("2026-07-31T01:00:00.000Z") },
  };
}

describe("password/F01 wallet reconciliation", () => {
  it("an offline victory credit shows in the effective balance before it syncs", async () => {
    const result = await loadWalletBalance(dependencies(new Set(), [reward], 10));
    expect(result.ok && result.value.effectiveStars).toBe(15);
  });

  it("the same credit stops being added once reward_ledger confirms it, without changing the total", async () => {
    const result = await loadWalletBalance(dependencies(new Set([reward.duelId]), [reward], 15));
    expect(result.ok && result.value).toMatchObject({ stars: 15, effectiveStars: 15, pendingStars: 0 });
  });

  it("draining the queue leaves the effective balance identical to the server balance", async () => {
    const result = await loadWalletBalance(dependencies(new Set(), [], 15));
    expect(result.ok && result.value).toMatchObject({ stars: 15, effectiveStars: 15, pendingDuelIds: [] });
  });
});
