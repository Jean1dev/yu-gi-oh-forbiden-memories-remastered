import { DomainError, err, ok, type CardCatalogLookup, type CollectionSnapshot, type PendingReward } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { CollectionCache } from "../collection/indexeddb-cache.ts";
import type { Clock } from "../collection/load-collection.ts";
import type { OfflineRewardApplication, RewardQueue } from "./offline-queue.ts";
import { registerCardReward } from "./register-card-reward.ts";
import type { RewardRepository } from "./supabase-repository.ts";

function fakeCatalog(knownNumbers: readonly string[]): CardCatalogLookup {
  return (cardNumber) => (knownNumbers.includes(cardNumber) ? ({ numero: cardNumber } as never) : undefined);
}

function fakeRewardQueue(initial: readonly PendingReward[] = []): RewardQueue {
  const store: PendingReward[] = [...initial];
  return {
    async enqueueReward(pending) {
      const index = store.findIndex((item) => item.duelId === pending.duelId);
      if (index >= 0) {
        store[index] = pending;
      } else {
        store.push(pending);
      }
    },
    async listPendingRewards(playerId) {
      return store
        .filter((item) => item.playerId === playerId)
        .sort((a, b) => (a.queuedAt < b.queuedAt ? -1 : a.queuedAt > b.queuedAt ? 1 : 0));
    },
    async removePendingReward(duelId) {
      const index = store.findIndex((item) => item.duelId === duelId);
      if (index >= 0) store.splice(index, 1);
    },
  };
}

function fakeCollectionCache(): CollectionCache {
  const snapshots = new Map<string, CollectionSnapshot>();
  return {
    async loadSnapshot(playerId) {
      return snapshots.get(playerId);
    },
    async saveSnapshot(snapshot) {
      snapshots.set(snapshot.playerId, snapshot);
    },
  };
}

const fixedClock: Clock = { now: () => new Date("2026-07-27T12:00:00.000Z") };

describe("registerCardReward", () => {
  it("applies the increment and returns status applied when the rpc responds applied true", async () => {
    const applyOfflineReward = vi.fn();
    const result = await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "001" },
      {
        catalog: fakeCatalog(["001"]),
        rewardRepository: { apply: async () => ok({ applied: true, currentQuantity: 3 }) },
        rewardQueue: fakeRewardQueue(),
        collectionCache: fakeCollectionCache(),
        applyOfflineReward,
        clock: fixedClock,
      },
    );

    expect(result).toEqual(ok({ status: "applied", currentQuantity: 3 }));
    expect(applyOfflineReward).not.toHaveBeenCalled();
  });

  it("returns status already_applied and reconciles the cache when the rpc responds applied false", async () => {
    const cache = fakeCollectionCache();

    const result = await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "001" },
      {
        catalog: fakeCatalog(["001"]),
        rewardRepository: { apply: async () => ok({ applied: false, currentQuantity: 5 }) },
        rewardQueue: fakeRewardQueue(),
        collectionCache: cache,
        applyOfflineReward: vi.fn(),
        clock: fixedClock,
      },
    );

    expect(result).toEqual(ok({ status: "already_applied", currentQuantity: 5 }));
    const snapshot = await cache.loadSnapshot("player-1");
    expect(snapshot?.entries["001"]).toBe(5);
  });

  it("does not call the rpc when the duelId is already in the local queue", async () => {
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const rewardQueue = fakeRewardQueue([
      { duelId: "duel-1", playerId: "player-1", cardNumber: "001", queuedAt: "2026-07-27T11:00:00.000Z" },
    ]);

    const result = await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "001" },
      {
        catalog: fakeCatalog(["001"]),
        rewardRepository: { apply },
        rewardQueue,
        collectionCache: fakeCollectionCache(),
        applyOfflineReward: vi.fn(),
        clock: fixedClock,
      },
    );

    expect(result).toEqual(ok({ status: "already_applied" }));
    expect(apply).not.toHaveBeenCalled();
  });

  it("applies to the local cache and enqueues when the rpc fails over the network", async () => {
    const applyOfflineReward = vi.fn(async () => new Map([["001", 1]]));

    const result = await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "001" },
      {
        catalog: fakeCatalog(["001"]),
        rewardRepository: { apply: async () => err(new DomainError("network down", "reward_apply_unavailable")) },
        rewardQueue: fakeRewardQueue(),
        collectionCache: fakeCollectionCache(),
        applyOfflineReward,
        clock: fixedClock,
      },
    );

    expect(result).toEqual(ok({ status: "applied_offline", localQuantity: 1 }));
    expect(applyOfflineReward).toHaveBeenCalledTimes(1);
  });

  it("writes the local increment and the enqueue in the same offline application", async () => {
    const applyOfflineReward = vi.fn(
      async (application: OfflineRewardApplication) => new Map([[application.cardNumber, 1]]),
    );

    await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "001" },
      {
        catalog: fakeCatalog(["001"]),
        rewardRepository: { apply: async () => err(new DomainError("timeout", "reward_apply_unavailable")) },
        rewardQueue: fakeRewardQueue(),
        collectionCache: fakeCollectionCache(),
        applyOfflineReward,
        clock: fixedClock,
      },
    );

    expect(applyOfflineReward).toHaveBeenCalledTimes(1);
    const [application] = applyOfflineReward.mock.calls[0] as [OfflineRewardApplication];
    expect(application.cardNumber).toBe("001");
    expect(application.pendingReward).toEqual({
      duelId: "duel-1",
      playerId: "player-1",
      cardNumber: "001",
      queuedAt: "2026-07-27T12:00:00.000Z",
    });
  });

  it("rejects an unknown card number without touching network, queue or cache", async () => {
    const apply = vi.fn();
    const enqueueReward = vi.fn();

    const result = await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "999" },
      {
        catalog: fakeCatalog(["001"]),
        rewardRepository: { apply },
        rewardQueue: { enqueueReward, listPendingRewards: async () => [], removePendingReward: vi.fn() },
        collectionCache: fakeCollectionCache(),
        applyOfflineReward: vi.fn(),
        clock: fixedClock,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_reward_card");
    expect(apply).not.toHaveBeenCalled();
    expect(enqueueReward).not.toHaveBeenCalled();
  });

  it("rejects a malformed event without touching network, queue or cache", async () => {
    const apply = vi.fn();
    const listPendingRewards = vi.fn(async () => []);

    const result = await registerCardReward(
      { playerId: "player-1", duelId: "", cardNumber: "001" },
      {
        catalog: fakeCatalog(["001"]),
        rewardRepository: { apply },
        rewardQueue: { enqueueReward: vi.fn(), listPendingRewards, removePendingReward: vi.fn() },
        collectionCache: fakeCollectionCache(),
        applyOfflineReward: vi.fn(),
        clock: fixedClock,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("malformed_reward_event");
    expect(apply).not.toHaveBeenCalled();
    expect(listPendingRewards).not.toHaveBeenCalled();
  });

  it("does not sum twice when processing the same duelId across successive calls", async () => {
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const deps = {
      catalog: fakeCatalog(["001"]),
      rewardRepository: { apply } as RewardRepository,
      rewardQueue: fakeRewardQueue(),
      collectionCache: fakeCollectionCache(),
      applyOfflineReward: vi.fn(),
      clock: fixedClock,
    };

    const first = await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "001" },
      deps,
    );
    apply.mockImplementation(async () => ok({ applied: false, currentQuantity: 1 }));
    const second = await registerCardReward(
      { playerId: "player-1", duelId: "duel-1", cardNumber: "001" },
      deps,
    );

    expect(first).toEqual(ok({ status: "applied", currentQuantity: 1 }));
    expect(second).toEqual(ok({ status: "already_applied", currentQuantity: 1 }));
    expect(apply).toHaveBeenCalledTimes(2);
  });
});
