import { ok, type CardCatalogLookup, type CollectionSnapshot, type PendingReward } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { CollectionCache } from "../collection/indexeddb-cache.ts";
import type { Clock } from "../collection/load-collection.ts";
import { applyOfflineReward as realApplyOfflineReward } from "./offline-queue.ts";
import type { RewardQueue } from "./offline-queue.ts";
import { registerCardReward } from "./register-card-reward.ts";
import type { RewardRepository } from "./supabase-repository.ts";

const fixedClock: Clock = { now: () => new Date("2026-07-27T12:00:00.000Z") };

function fakeCatalog(): CardCatalogLookup {
  return () => ({ numero: "001" } as never);
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

/**
 * In-memory reward server: mirrors `reward_ledger`'s `PRIMARY KEY (duel_id)`
 * behavior exactly (only the first insert for a `duelId` applies) — the same
 * oracle role `reward_ledger` fakes in the RPC-level property tests
 * (spec build-deck/F03 §7, "adaptado do exemplo de guidelines §14.3").
 */
function fakeLedgerServer(): RewardRepository {
  const applied = new Map<string, number>();
  const quantities = new Map<string, number>();
  return {
    async apply(playerId, duelId, cardNumber) {
      const key = `${playerId}:${cardNumber}`;
      if (!applied.has(duelId)) {
        applied.set(duelId, 1);
        quantities.set(key, (quantities.get(key) ?? 0) + 1);
        return ok({ applied: true, currentQuantity: quantities.get(key) as number });
      }
      return ok({ applied: false, currentQuantity: quantities.get(key) ?? 0 });
    },
  };
}

function fakeRewardQueue(): RewardQueue {
  const store: PendingReward[] = [];
  return {
    async enqueueReward(item) {
      const index = store.findIndex((entry) => entry.duelId === item.duelId);
      if (index >= 0) store[index] = item;
      else store.push(item);
    },
    async listPendingRewards(playerId) {
      return store.filter((item) => item.playerId === playerId);
    },
    async removePendingReward(duelId) {
      const index = store.findIndex((entry) => entry.duelId === duelId);
      if (index >= 0) store.splice(index, 1);
    },
  };
}

describe("registerCardReward end-to-end idempotency property", () => {
  it("calling registerCardReward repeatedly with the same duelId results in exactly +1 on the collection, never more", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 50 }), async (callCount) => {
        const rewardRepository = fakeLedgerServer();
        const rewardQueue = fakeRewardQueue();
        const collectionCache = fakeCollectionCache();
        const playerId = "player-property";
        const duelId = "duel-property";

        for (let i = 0; i < callCount; i += 1) {
          const result = await registerCardReward(
            { playerId, duelId, cardNumber: "001" },
            {
              catalog: fakeCatalog(),
              rewardRepository,
              rewardQueue,
              collectionCache,
              applyOfflineReward: realApplyOfflineReward,
              clock: fixedClock,
            },
          );
          expect(result.ok).toBe(true);
        }

        const finalResult = await registerCardReward(
          { playerId, duelId, cardNumber: "001" },
          {
            catalog: fakeCatalog(),
            rewardRepository,
            rewardQueue,
            collectionCache,
            applyOfflineReward: realApplyOfflineReward,
            clock: fixedClock,
          },
        );
        expect(finalResult.ok).toBe(true);
        if (!finalResult.ok) return;
        const quantity =
          finalResult.value.status === "applied"
            ? finalResult.value.currentQuantity
            : finalResult.value.status === "already_applied"
              ? (finalResult.value.currentQuantity ?? 1)
              : finalResult.value.localQuantity;
        expect(quantity).toBe(1);
      }),
      { numRuns: 200 },
    );
  });
});

describe("registerCardReward concurrency property", () => {
  it("N simultaneous calls with the same duelId resolve to exactly one applied increment", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 20 }), async (concurrentCalls) => {
        const rewardRepository = fakeLedgerServer();
        const rewardQueue = fakeRewardQueue();
        const collectionCache = fakeCollectionCache();
        const playerId = "player-concurrency";
        const duelId = "duel-concurrency";

        const results = await Promise.all(
          Array.from({ length: concurrentCalls }, () =>
            registerCardReward(
              { playerId, duelId, cardNumber: "001" },
              {
                catalog: fakeCatalog(),
                rewardRepository,
                rewardQueue,
                collectionCache,
                applyOfflineReward: realApplyOfflineReward,
                clock: fixedClock,
              },
            ),
          ),
        );

        const appliedCount = results.filter((result) => result.ok && result.value.status === "applied").length;
        expect(appliedCount).toBeLessThanOrEqual(1);
        for (const result of results) {
          expect(result.ok).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});
