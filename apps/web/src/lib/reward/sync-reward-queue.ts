import { validateRewardCardNumber } from "@yugioh/rules";
import type { CardCatalogLookup } from "@yugioh/shared";

import { log } from "../logging.ts";
import type { RewardQueue } from "./offline-queue.ts";
import type { RewardRepository } from "./supabase-repository.ts";

export type SyncRewardQueueDeps = Readonly<{
  playerId: string;
  catalog: CardCatalogLookup;
  rewardRepository: RewardRepository;
  rewardQueue: RewardQueue;
}>;

/** Outcome of one `syncRewardQueue` run. */
export type RewardSyncSummary = Readonly<{
  applied: number;
  removed: number;
  remaining: number;
}>;

/**
 * Drains the offline reward queue on reconnect (spec build-deck/F03 §3, steps
 * 7-10). Processes pending rewards in FIFO order (`queuedAt` ascending, the
 * order `RewardQueue.listPendingRewards` already returns them in) and never
 * reorders or skips ahead: a network failure on one item stops that item
 * only — later items in the same run are still attempted, and the failed
 * item stays queued for the next sync. A `duelId` the server confirms
 * (applied or already applied) always leaves the queue; only a `numero` that
 * has gone invalid since it was queued is removed without ever being applied
 * (spec Decision 7, revalidated against the current catalog before every
 * retry).
 */
export async function syncRewardQueue(deps: SyncRewardQueueDeps): Promise<RewardSyncSummary> {
  const pending = await deps.rewardQueue.listPendingRewards(deps.playerId);

  let applied = 0;
  let removed = 0;

  for (const item of pending) {
    const validated = validateRewardCardNumber(item.cardNumber, deps.catalog);
    if (!validated.ok) {
      await deps.rewardQueue.removePendingReward(item.duelId);
      removed += 1;
      log("warn", "recompensa_invalida", {
        playerId: item.playerId,
        duelId: item.duelId,
        cardNumber: item.cardNumber,
      });
      continue;
    }

    const result = await deps.rewardRepository.apply(item.playerId, item.duelId, item.cardNumber);
    if (!result.ok) {
      log("warn", "reward_apply_failed", { duelId: item.duelId, cause: result.error.message, stage: "sync" });
      continue;
    }

    await deps.rewardQueue.removePendingReward(item.duelId);
    removed += 1;
    if (result.value.applied) {
      applied += 1;
    }
  }

  return { applied, removed, remaining: pending.length - removed };
}
