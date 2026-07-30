import {
  ok,
  type CardCatalogLookup,
  type ConsolidatedDuelResult,
  type DropPool,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

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

const fixedClock: Clock = { now: () => new Date("2026-07-27T12:00:00.000Z") };

const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001", "002"] }];

function victoryResult(duelSessionId: string): Extract<ConsolidatedDuelResult, { status: "victory" }> {
  return {
    status: "victory",
    duelSessionId,
    reason: "lp_zerado",
    rating: {
      source: "rating_engine",
      grade: "A",
      reward: { stars: 10, dropTier: "common" },
    },
  };
}

function baseDeps(overrides: Partial<GrantCardDropDeps> = {}): GrantCardDropDeps {
  return {
    catalog: fakeCatalog(["001", "002"]),
    rewardRepository: { apply: async () => ok({ applied: true, currentQuantity: 1 }) },
    rewardQueue: fakeRewardQueue(),
    collectionCache: fakeCollectionCache(),
    applyOfflineReward: vi.fn(),
    clock: fixedClock,
    defaultCommonDropPool: ["099"],
    cache: createGrantCardDropCache(),
    ...overrides,
  };
}

describe("grantCardDrop", () => {
  it("selects a card and registers the reward via registerCardReward", async () => {
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const deps = baseDeps({ rewardRepository: { apply } });

    const result = await grantCardDrop(
      victoryResult("session-1"),
      { playerId: "player-1", dropPool },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(["001", "002"]).toContain(result.value.outcome.cardNumber);
    expect(result.value.reward).toEqual({ status: "applied", currentQuantity: 1 });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("player-1", "session-1", result.value.outcome.cardNumber);
  });

  it("does not call registerCardReward when the selection fails", async () => {
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const deps = baseDeps({ rewardRepository: { apply }, defaultCommonDropPool: [] });

    const emptyPool: DropPool = [];
    const result = await grantCardDrop(
      victoryResult("session-2"),
      { playerId: "player-1", dropPool: emptyPool },
      deps,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("no_drop_candidates_available");
    expect(apply).not.toHaveBeenCalled();
  });

  it("reuses the cached outcome for the same duelSessionId without selecting or registering again", async () => {
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const cache = createGrantCardDropCache();
    const deps = baseDeps({ rewardRepository: { apply }, cache });

    const first = await grantCardDrop(
      victoryResult("session-3"),
      { playerId: "player-1", dropPool },
      deps,
    );
    const second = await grantCardDrop(
      victoryResult("session-3"),
      { playerId: "player-1", dropPool },
      deps,
    );

    expect(first).toEqual(second);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("propagates the applied_offline status from registerCardReward unchanged", async () => {
    const deps = baseDeps({
      rewardRepository: {
        apply: async () =>
          ({ ok: false, error: new Error("offline") } as never),
      },
      applyOfflineReward: vi.fn(async () => new Map([["001", 1]])),
    });

    const result = await grantCardDrop(
      victoryResult("session-4"),
      { playerId: "player-1", dropPool },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reward.status).toBe("applied_offline");
  });

  it("propagates the already_applied status from registerCardReward unchanged", async () => {
    const deps = baseDeps({
      rewardRepository: { apply: async () => ok({ applied: false, currentQuantity: 4 }) },
    });

    const result = await grantCardDrop(
      victoryResult("session-5"),
      { playerId: "player-1", dropPool },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reward).toEqual({ status: "already_applied", currentQuantity: 4 });
  });

  it("builds the CardRewardEvent with duelId equal to duelSessionId", async () => {
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const deps = baseDeps({ rewardRepository: { apply } });

    await grantCardDrop(victoryResult("session-6"), { playerId: "player-1", dropPool }, deps);

    expect(apply).toHaveBeenCalledWith("player-1", "session-6", expect.any(String));
  });
});
