import { DomainError, err, ok, type Card } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { applyVictoryReward, type ApplyVictoryRewardDeps } from "./apply-victory-reward.ts";

const card = { numero: "001" } as Card;
const baseDeps = (): ApplyVictoryRewardDeps => ({
  catalog: () => card,
  victoryRewardRepository: {
    apply: async () => ok({ applied: true, cardQuantity: 2, walletStars: 10 }),
  },
  victoryRewardQueue: {
    enqueueReward: async () => undefined,
    listPendingRewards: async () => [],
    removePendingReward: async () => undefined,
  },
  collectionCache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
  walletCache: { loadSnapshot: async () => undefined, saveSnapshot: async () => undefined },
  applyOfflineVictoryReward: async () => ({ collection: new Map([["001", 1]]), wallet: { playerId: "p", stars: 4 } }),
  clock: { now: () => new Date("2026-07-30T00:00:00Z") },
});
const event = { playerId: "p", duelId: "d", cardNumber: "001", stars: 4 };

describe("applyVictoryReward", () => {
  it("validates before I/O and applies both values", async () => {
    expect((await applyVictoryReward({}, baseDeps())).ok).toBe(false);
    expect(await applyVictoryReward(event, baseDeps())).toEqual({
      ok: true,
      value: { status: "applied", cardQuantity: 2, walletStars: 10 },
    });
  });

  it("deduplicates locally without a network call", async () => {
    const apply = vi.fn();
    const deps = baseDeps();
    const result = await applyVictoryReward(event, {
      ...deps,
      victoryRewardRepository: { apply },
      victoryRewardQueue: {
        ...deps.victoryRewardQueue,
        listPendingRewards: async () => [{ ...event, queuedAt: "now" }],
      },
    });
    expect(result).toEqual({ ok: true, value: { status: "already_applied" } });
    expect(apply).not.toHaveBeenCalled();
  });

  it("falls back atomically when the rpc fails", async () => {
    const deps = baseDeps();
    const result = await applyVictoryReward(event, {
      ...deps,
      victoryRewardRepository: {
        apply: async () => err(new DomainError("offline", "victory_reward_apply_unavailable")),
      },
    });
    expect(result).toEqual({
      ok: true,
      value: { status: "applied_offline", localCardQuantity: 1, localWalletStars: 4 },
    });
  });
});
