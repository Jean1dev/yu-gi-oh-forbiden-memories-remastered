import { ok } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { syncVictoryRewardQueue } from "./sync-victory-reward-queue.ts";

vi.mock("../logging.ts", () => ({ log: vi.fn() }));
import { log } from "../logging.ts";

describe("syncVictoryRewardQueue", () => {
  it("removes rewards confirmed by the server", async () => {
    const remove = vi.fn(async () => undefined);
    const result = await syncVictoryRewardQueue({
      playerId: "player",
      catalog: () => ({ numero: "001" }) as never,
      repository: {
        apply: async () => ok({ applied: true, cardQuantity: 1, walletStars: 4 }),
      },
      queue: {
        enqueueReward: async () => undefined,
        listPendingRewards: async () => [
          { playerId: "player", duelId: "duel", cardNumber: "001", stars: 4, queuedAt: "now" },
        ],
        removePendingReward: remove,
      },
    });
    expect(result).toEqual({ applied: 1, removed: 1, remaining: 0 });
    expect(remove).toHaveBeenCalledWith("duel");
    expect(log).toHaveBeenCalledWith("info", "victory_reward_queue_synced", {
      playerId: "player", applied: 1, removed: 1, remaining: 0,
    });
  });

  it("logs an invalid item before discarding it", async () => {
    const remove = vi.fn(async () => undefined);
    await syncVictoryRewardQueue({
      playerId: "player",
      catalog: () => undefined,
      repository: { apply: vi.fn() },
      queue: {
        enqueueReward: async () => undefined,
        listPendingRewards: async () => [
          { playerId: "player", duelId: "bad-duel", cardNumber: "001", stars: 4, queuedAt: "now" },
        ],
        removePendingReward: remove,
      },
    });
    expect(log).toHaveBeenCalledWith("warn", "victory_reward_queue_item_discarded", {
      playerId: "player", duelId: "bad-duel", code: "invalid_reward_card",
    });
    expect(remove).toHaveBeenCalledWith("bad-duel");
  });

  it("logs an unavailable queue and returns an empty summary", async () => {
    const result = await syncVictoryRewardQueue({
      playerId: "player",
      catalog: () => ({ numero: "001" }) as never,
      repository: { apply: vi.fn() },
      queue: {
        enqueueReward: async () => undefined,
        listPendingRewards: async () => { throw new Error("indexeddb unavailable"); },
        removePendingReward: async () => undefined,
      },
    });
    expect(result).toEqual({ applied: 0, removed: 0, remaining: 0 });
    expect(log).toHaveBeenCalledWith("warn", "victory_reward_queue_unavailable", {
      playerId: "player", cause: "indexeddb unavailable",
    });
  });
});
