import "fake-indexeddb/auto";

import { randomUUID } from "node:crypto";

import type { PendingReward } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { createIndexedDbCollectionCache } from "../collection/indexeddb-cache.ts";
import { applyOfflineReward, createIndexedDbRewardQueue } from "./offline-queue.ts";

function pendingReward(overrides: Partial<PendingReward> = {}): PendingReward {
  return {
    duelId: randomUUID(),
    playerId: randomUUID(),
    cardNumber: "001",
    queuedAt: "2026-07-27T12:00:00.000Z",
    ...overrides,
  };
}

describe("createIndexedDbRewardQueue", () => {
  it("enqueueReward replaces without duplicating when the duelId already exists in the queue", async () => {
    const queue = createIndexedDbRewardQueue();
    const playerId = randomUUID();
    const duelId = randomUUID();

    await queue.enqueueReward(pendingReward({ duelId, playerId, cardNumber: "001" }));
    await queue.enqueueReward(
      pendingReward({ duelId, playerId, cardNumber: "002", queuedAt: "2026-07-27T12:00:05.000Z" }),
    );

    const pending = await queue.listPendingRewards(playerId);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.cardNumber).toBe("002");
  });

  it("listPendingRewards returns the player's pending rewards in queuing order", async () => {
    const queue = createIndexedDbRewardQueue();
    const playerId = randomUUID();
    const otherPlayerId = randomUUID();

    await queue.enqueueReward(pendingReward({ playerId, queuedAt: "2026-07-27T12:00:02.000Z" }));
    await queue.enqueueReward(pendingReward({ playerId, queuedAt: "2026-07-27T12:00:00.000Z" }));
    await queue.enqueueReward(pendingReward({ playerId, queuedAt: "2026-07-27T12:00:01.000Z" }));
    await queue.enqueueReward(pendingReward({ playerId: otherPlayerId }));

    const pending = await queue.listPendingRewards(playerId);
    expect(pending.map((item) => item.queuedAt)).toEqual([
      "2026-07-27T12:00:00.000Z",
      "2026-07-27T12:00:01.000Z",
      "2026-07-27T12:00:02.000Z",
    ]);
  });

  it("removePendingReward removes the entry so it no longer appears in the listing", async () => {
    const queue = createIndexedDbRewardQueue();
    const playerId = randomUUID();
    const duelId = randomUUID();

    await queue.enqueueReward(pendingReward({ duelId, playerId }));
    await queue.removePendingReward(duelId);

    expect(await queue.listPendingRewards(playerId)).toEqual([]);
  });
});

describe("applyOfflineReward", () => {
  it("writes the collection point increment and the queue entry together", async () => {
    const playerId = randomUUID();
    const duelId = randomUUID();

    const updated = await applyOfflineReward({
      playerId,
      cardNumber: "001",
      pendingReward: { duelId, playerId, cardNumber: "001", queuedAt: "2026-07-27T12:00:00.000Z" },
    });

    expect(updated.get("001")).toBe(1);

    const cache = createIndexedDbCollectionCache();
    const snapshot = await cache.loadSnapshot(playerId);
    expect(snapshot?.entries["001"]).toBe(1);

    const queue = createIndexedDbRewardQueue();
    const pending = await queue.listPendingRewards(playerId);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.duelId).toBe(duelId);
  });

  it("increments an existing cached snapshot instead of overwriting it, preserving syncedAt", async () => {
    const playerId = randomUUID();
    const cache = createIndexedDbCollectionCache();
    await cache.saveSnapshot({ playerId, entries: { "001": 2 }, syncedAt: "2026-07-27T10:00:00.000Z" });

    const updated = await applyOfflineReward({
      playerId,
      cardNumber: "001",
      pendingReward: {
        duelId: randomUUID(),
        playerId,
        cardNumber: "001",
        queuedAt: "2026-07-27T12:00:00.000Z",
      },
    });

    expect(updated.get("001")).toBe(3);
    const snapshot = await cache.loadSnapshot(playerId);
    expect(snapshot?.entries["001"]).toBe(3);
    expect(snapshot?.syncedAt).toBe("2026-07-27T10:00:00.000Z");
  });
});
