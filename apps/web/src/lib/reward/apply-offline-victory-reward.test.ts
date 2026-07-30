import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { DATABASE_NAME } from "../collection/indexeddb-cache.ts";
import { createIndexedDbVictoryRewardQueue } from "./victory-reward-queue.ts";
import { applyOfflineVictoryReward } from "./apply-offline-victory-reward.ts";

afterEach(
  () =>
    new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.onsuccess = () => resolve();
    }),
);

describe("applyOfflineVictoryReward", () => {
  it("writes the card, wallet, and queue in one transaction", async () => {
    const pendingReward = {
      playerId: "player",
      duelId: "duel",
      cardNumber: "001",
      stars: 5,
      queuedAt: "now",
    } as const;
    const result = await applyOfflineVictoryReward({
      playerId: "player",
      cardNumber: "001",
      stars: 5,
      pendingReward,
    });
    expect(result.collection.get("001")).toBe(1);
    expect(result.wallet.stars).toBe(5);
    expect(await createIndexedDbVictoryRewardQueue().listPendingRewards("player")).toEqual([
      pendingReward,
    ]);
  });
});
