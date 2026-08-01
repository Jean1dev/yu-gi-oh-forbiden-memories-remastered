import { DomainError, err, ok, type Card, type PendingVictoryReward } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { applyVictoryReward, type ApplyVictoryRewardDeps } from "../src/lib/reward/apply-victory-reward.ts";
import { syncVictoryRewardQueue } from "../src/lib/reward/sync-victory-reward-queue.ts";

const event = { playerId: "player", duelId: "duel", cardNumber: "001", stars: 13 };

function baseDeps(apply: ApplyVictoryRewardDeps["victoryRewardRepository"]["apply"]): ApplyVictoryRewardDeps {
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
    applyOfflineVictoryReward: async () => ({
      collection: new Map([["001", 1]]),
      wallet: { playerId: "player", stars: event.stars },
    }),
    clock: { now: () => new Date("2026-07-31T00:00:00.000Z") },
  };
}

describe("password/F02 victory star credit integration", () => {
  it("credits card and stars together and reprocessing the duel changes neither twice", async () => {
    const ledger = new Set<string>();
    let cardQuantity = 0;
    let walletStars = 0;
    const apply = vi.fn(async (_playerId: string, duelId: string, _cardNumber: string, stars: number) => {
      const applied = !ledger.has(duelId);
      if (applied) {
        ledger.add(duelId);
        cardQuantity += 1;
        walletStars += stars;
      }
      return ok({ applied, cardQuantity, walletStars });
    });
    const deps = baseDeps(apply);

    expect(await applyVictoryReward(event, deps)).toEqual({
      ok: true,
      value: { status: "applied", cardQuantity: 1, walletStars: 13 },
    });
    expect(await applyVictoryReward(event, deps)).toEqual({
      ok: true,
      value: { status: "already_applied", cardQuantity: 1, walletStars: 13 },
    });
    expect({ cardQuantity, walletStars }).toEqual({ cardQuantity: 1, walletStars: 13 });
  });

  it("stores an offline credit as one unit and drains it exactly once after reconnecting", async () => {
    const pending: PendingVictoryReward[] = [];
    let localCardQuantity = 0;
    let localWalletStars = 0;
    const offlineDeps = baseDeps(async () => err(new DomainError("offline", "victory_reward_apply_unavailable")));
    const result = await applyVictoryReward(event, {
      ...offlineDeps,
      applyOfflineVictoryReward: async (application) => {
        localCardQuantity += 1;
        localWalletStars += application.stars;
        pending.push(application.pendingReward);
        return {
          collection: new Map([[application.cardNumber, localCardQuantity]]),
          wallet: { playerId: application.playerId, stars: localWalletStars },
        };
      },
    });
    expect(result).toEqual({
      ok: true,
      value: { status: "applied_offline", localCardQuantity: 1, localWalletStars: 13 },
    });
    expect(pending).toHaveLength(1);

    const appliedDuels = new Set<string>();
    let serverWalletStars = 0;
    const repository = {
      apply: async (_playerId: string, duelId: string, _cardNumber: string, stars: number) => {
        const applied = !appliedDuels.has(duelId);
        if (applied) {
          appliedDuels.add(duelId);
          serverWalletStars += stars;
        }
        return ok({ applied, cardQuantity: 1, walletStars: serverWalletStars });
      },
    };
    const queue = {
      enqueueReward: async (reward: PendingVictoryReward) => void pending.push(reward),
      listPendingRewards: async () => pending,
      removePendingReward: async (duelId: string) => {
        const index = pending.findIndex((item) => item.duelId === duelId);
        if (index >= 0) pending.splice(index, 1);
      },
    };
    const syncDeps = { playerId: "player", catalog: () => ({ numero: "001" }) as Card, repository, queue };
    expect(await syncVictoryRewardQueue(syncDeps)).toEqual({ applied: 1, removed: 1, remaining: 0 });
    expect(await syncVictoryRewardQueue(syncDeps)).toEqual({ applied: 0, removed: 0, remaining: 0 });
    expect(serverWalletStars).toBe(13);
  });
});
