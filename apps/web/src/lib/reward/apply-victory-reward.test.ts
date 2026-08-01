import { DomainError, err, ok, type Card } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { applyVictoryReward, type ApplyVictoryRewardDeps } from "./apply-victory-reward.ts";

vi.mock("../logging.ts", () => ({ log: vi.fn() }));
import { log } from "../logging.ts";

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
  it("rejects and logs a malformed event before any I/O", async () => {
    const deps = baseDeps();
    const listPendingRewards = vi.fn(deps.victoryRewardQueue.listPendingRewards);
    const apply = vi.fn(deps.victoryRewardRepository.apply);
    const result = await applyVictoryReward({ ...event, duelId: "" }, {
      ...deps,
      victoryRewardQueue: { ...deps.victoryRewardQueue, listPendingRewards },
      victoryRewardRepository: { apply },
    });
    expect(result.ok).toBe(false);
    expect(listPendingRewards).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("warn", "victory_reward_event_malformed", expect.any(Object));
  });

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
    expect(log).toHaveBeenCalledWith("info", "victory_reward_apply_finished", {
      playerId: "p", duelId: "d", status: "already_applied", source: "local_queue",
    });
  });

  it("continues online and logs when the local queue is unavailable", async () => {
    const deps = baseDeps();
    const apply = vi.fn(deps.victoryRewardRepository.apply);
    const result = await applyVictoryReward(event, {
      ...deps,
      victoryRewardRepository: { apply },
      victoryRewardQueue: {
        ...deps.victoryRewardQueue,
        listPendingRewards: async () => { throw new Error("indexeddb unavailable"); },
      },
    });
    expect(result.ok).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("warn", "victory_reward_queue_unavailable", {
      playerId: "p", cause: "indexeddb unavailable",
    });
  });

  it("logs a duplicate reported by the server", async () => {
    const deps = baseDeps();
    const result = await applyVictoryReward(event, {
      ...deps,
      victoryRewardRepository: {
        apply: async () => ok({ applied: false, cardQuantity: 2, walletStars: 10 }),
      },
    });
    expect(result).toEqual({ ok: true, value: { status: "already_applied", cardQuantity: 2, walletStars: 10 } });
    expect(log).toHaveBeenCalledWith("info", "victory_reward_apply_finished", {
      playerId: "p", duelId: "d", status: "already_applied",
    });
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
