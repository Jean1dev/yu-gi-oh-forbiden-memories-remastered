import { DomainError, err, ok, type CardCatalogLookup, type PendingReward } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { RewardQueue } from "./offline-queue.ts";
import { syncRewardQueue } from "./sync-reward-queue.ts";

function fakeCatalog(knownNumbers: readonly string[]): CardCatalogLookup {
  return (cardNumber) => (knownNumbers.includes(cardNumber) ? ({ numero: cardNumber } as never) : undefined);
}

function pending(overrides: Partial<PendingReward> = {}): PendingReward {
  return {
    duelId: "duel-1",
    playerId: "player-1",
    cardNumber: "001",
    queuedAt: "2026-07-27T12:00:00.000Z",
    ...overrides,
  };
}

function fakeRewardQueue(initial: readonly PendingReward[]): RewardQueue & { removed: string[] } {
  const store = [...initial];
  const removed: string[] = [];
  return {
    removed,
    async enqueueReward(item) {
      store.push(item);
    },
    async listPendingRewards() {
      return store;
    },
    async removePendingReward(duelId) {
      removed.push(duelId);
    },
  };
}

describe("syncRewardQueue", () => {
  it("removes from the queue the items applied successfully", async () => {
    const rewardQueue = fakeRewardQueue([pending()]);
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));

    const summary = await syncRewardQueue({
      playerId: "player-1",
      catalog: fakeCatalog(["001"]),
      rewardRepository: { apply },
      rewardQueue,
    });

    expect(rewardQueue.removed).toEqual(["duel-1"]);
    expect(summary).toEqual({ applied: 1, removed: 1, remaining: 0 });
  });

  it("keeps in the queue the item whose call fails over the network", async () => {
    const rewardQueue = fakeRewardQueue([pending()]);
    const apply = vi.fn(async () => err(new DomainError("network down", "reward_apply_unavailable")));

    const summary = await syncRewardQueue({
      playerId: "player-1",
      catalog: fakeCatalog(["001"]),
      rewardRepository: { apply },
      rewardQueue,
    });

    expect(rewardQueue.removed).toEqual([]);
    expect(summary).toEqual({ applied: 0, removed: 0, remaining: 1 });
  });

  it("preserves queuing order while processing", async () => {
    const items = [
      pending({ duelId: "duel-a", queuedAt: "2026-07-27T12:00:00.000Z" }),
      pending({ duelId: "duel-b", queuedAt: "2026-07-27T12:00:01.000Z" }),
      pending({ duelId: "duel-c", queuedAt: "2026-07-27T12:00:02.000Z" }),
    ];
    const rewardQueue = fakeRewardQueue(items);
    const calledOrder: string[] = [];
    const apply = vi.fn(async (_playerId: string, duelId: string) => {
      calledOrder.push(duelId);
      return ok({ applied: true, currentQuantity: 1 });
    });

    await syncRewardQueue({
      playerId: "player-1",
      catalog: fakeCatalog(["001"]),
      rewardRepository: { apply },
      rewardQueue,
    });

    expect(calledOrder).toEqual(["duel-a", "duel-b", "duel-c"]);
    expect(rewardQueue.removed).toEqual(["duel-a", "duel-b", "duel-c"]);
  });

  it("does not stop the following items when one item fails", async () => {
    const items = [
      pending({ duelId: "duel-a", queuedAt: "2026-07-27T12:00:00.000Z" }),
      pending({ duelId: "duel-b", queuedAt: "2026-07-27T12:00:01.000Z" }),
    ];
    const rewardQueue = fakeRewardQueue(items);
    const apply = vi.fn(async (_playerId: string, duelId: string) =>
      duelId === "duel-a"
        ? err(new DomainError("network down", "reward_apply_unavailable"))
        : ok({ applied: true, currentQuantity: 1 }),
    );

    const summary = await syncRewardQueue({
      playerId: "player-1",
      catalog: fakeCatalog(["001"]),
      rewardRepository: { apply },
      rewardQueue,
    });

    expect(rewardQueue.removed).toEqual(["duel-b"]);
    expect(summary).toEqual({ applied: 1, removed: 1, remaining: 1 });
  });

  it("removes from the queue the item whose card number has become invalid", async () => {
    const rewardQueue = fakeRewardQueue([pending({ cardNumber: "999" })]);
    const apply = vi.fn();

    const summary = await syncRewardQueue({
      playerId: "player-1",
      catalog: fakeCatalog(["001"]),
      rewardRepository: { apply },
      rewardQueue,
    });

    expect(apply).not.toHaveBeenCalled();
    expect(rewardQueue.removed).toEqual(["duel-1"]);
    expect(summary).toEqual({ applied: 0, removed: 1, remaining: 0 });
  });
});
