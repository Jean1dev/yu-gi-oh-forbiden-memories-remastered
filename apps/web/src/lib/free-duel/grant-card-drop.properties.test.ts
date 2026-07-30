import {
  ok,
  type CardCatalogLookup,
  type ConsolidatedDuelResult,
  type DropPool,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { CollectionCache } from "../collection/indexeddb-cache.ts";
import type { Clock } from "../collection/load-collection.ts";
import type { RewardQueue } from "../reward/offline-queue.ts";
import { createGrantCardDropCache, grantCardDrop, type GrantCardDropDeps } from "./grant-card-drop.ts";

function fakeCatalog(knownNumbers: readonly string[]): CardCatalogLookup {
  return (cardNumber) => (knownNumbers.includes(cardNumber) ? ({ numero: cardNumber } as never) : undefined);
}

function fakeRewardQueue(): RewardQueue {
  return {
    async enqueueReward() {},
    async listPendingRewards() {
      return [];
    },
    async removePendingReward() {},
  };
}

function fakeCollectionCache(): CollectionCache {
  return {
    async loadSnapshot() {
      return undefined;
    },
    async saveSnapshot() {},
  };
}

const fixedClock: Clock = { now: () => new Date("2026-07-30T12:00:00.000Z") };
const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001", "002"] }];

function victoryResult(duelSessionId: string): Extract<ConsolidatedDuelResult, { status: "victory" }> {
  return {
    status: "victory",
    duelSessionId,
    reason: "lp_zerado",
    rating: { source: "rating_engine", grade: "A", reward: { stars: 10, dropTier: "common" } },
  };
}

describe("grantCardDrop concurrency property", () => {
  it(
    "N concurrent calls for the same duelSessionId all agree on the granted card and " +
      "the composed flow credits it exactly once, adapted from build-deck/F03 guidelines §14.3",
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 8 }), async (concurrency) => {
          let appliedCount = 0;
          const deps: GrantCardDropDeps = {
            catalog: fakeCatalog(["001", "002"]),
            rewardRepository: {
              apply: async () => {
                appliedCount += 1;
                return ok({ applied: appliedCount === 1, currentQuantity: 1 });
              },
            },
            rewardQueue: fakeRewardQueue(),
            collectionCache: fakeCollectionCache(),
            applyOfflineReward: async () => new Map(),
            clock: fixedClock,
            defaultCommonDropPool: ["099"],
            cache: createGrantCardDropCache(),
          };
          const result = victoryResult("session-concurrency");

          const settled = await Promise.all(
            Array.from({ length: concurrency }, () =>
              grantCardDrop(result, { playerId: "player-1", dropPool }, deps),
            ),
          );

          expect(settled.every((entry) => entry.ok)).toBe(true);
          const cardNumbers = new Set(
            settled.map((entry) => (entry.ok ? entry.value.outcome.cardNumber : undefined)),
          );
          expect(cardNumbers.size).toBe(1);

          const appliedResults = settled.filter(
            (entry) => entry.ok && entry.value.reward.status === "applied",
          );
          expect(appliedResults.length).toBe(1);
        }),
        { numRuns: 100 },
      );
    },
  );
});
