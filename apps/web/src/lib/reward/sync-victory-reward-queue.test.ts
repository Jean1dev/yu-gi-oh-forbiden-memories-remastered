import { ok } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { syncVictoryRewardQueue } from "./sync-victory-reward-queue.ts";

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
  });
});
