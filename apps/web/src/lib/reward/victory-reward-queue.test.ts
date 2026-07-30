import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { DATABASE_NAME } from "../collection/indexeddb-cache.ts";
import { createIndexedDbVictoryRewardQueue } from "./victory-reward-queue.ts";

afterEach(
  () =>
    new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.onsuccess = () => resolve();
    }),
);

describe("createIndexedDbVictoryRewardQueue", () => {
  it("stores by duel and returns entries in FIFO order", async () => {
    const queue = createIndexedDbVictoryRewardQueue();
    await queue.enqueueReward({
      playerId: "player",
      duelId: "duel-2",
      cardNumber: "001",
      stars: 2,
      queuedAt: "2026-02-01",
    });
    await queue.enqueueReward({
      playerId: "player",
      duelId: "duel-1",
      cardNumber: "001",
      stars: 1,
      queuedAt: "2026-01-01",
    });
    expect((await queue.listPendingRewards("player")).map((item) => item.duelId)).toEqual([
      "duel-1",
      "duel-2",
    ]);
    await queue.removePendingReward("duel-1");
    expect(await queue.listPendingRewards("player")).toHaveLength(1);
  });
});
