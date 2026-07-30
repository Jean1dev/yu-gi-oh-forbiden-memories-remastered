import { ok, type Card, type ConsolidatedDuelResult, type DropPool } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import {
  createGrantVictoryRewardCache,
  grantVictoryReward,
  type GrantVictoryRewardDeps,
} from "./grant-victory-reward.ts";

const result: Extract<ConsolidatedDuelResult, { status: "victory" }> = {
  status: "victory",
  duelSessionId: "session",
  reason: "lp_zerado",
  rating: { source: "rating_engine", grade: "A", reward: { stars: 11, dropTier: "common" } },
};
const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001"] }];

function deps(apply = vi.fn(async () => ok({ applied: true, cardQuantity: 1, walletStars: 11 }))): GrantVictoryRewardDeps {
  return {
    catalog: () => ({ numero: "001" }) as Card,
    victoryRewardRepository: { apply },
    victoryRewardQueue: {
      enqueueReward: async () => undefined,
      listPendingRewards: async () => [],
      removePendingReward: async () => undefined,
    },
    collectionCache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
    walletCache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
    applyOfflineVictoryReward: async () => {
      throw new Error("not used");
    },
    clock: { now: () => new Date(0) },
    defaultCommonDropPool: ["001"],
    cache: createGrantVictoryRewardCache(),
  };
}

describe("grantVictoryReward", () => {
  it("selects a card and sends it with the exact rating stars and session id", async () => {
    const apply = vi.fn(async () => ok({ applied: true, cardQuantity: 1, walletStars: 11 }));
    const granted = await grantVictoryReward(result, { playerId: "player", dropPool }, deps(apply));
    expect(granted.ok).toBe(true);
    expect(apply).toHaveBeenCalledWith("player", "session", "001", 11);
  });

  it("does not apply either reward when card selection fails", async () => {
    const apply = vi.fn();
    const configured = { ...deps(apply), defaultCommonDropPool: [] };
    const granted = await grantVictoryReward(result, { playerId: "player", dropPool: [] }, configured);
    expect(granted.ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it("reuses a cached result for repeated renders", async () => {
    const apply = vi.fn(async () => ok({ applied: true, cardQuantity: 1, walletStars: 11 }));
    const configured = deps(apply);
    expect(
      await grantVictoryReward(result, { playerId: "player", dropPool }, configured),
    ).toEqual(await grantVictoryReward(result, { playerId: "player", dropPool }, configured));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
