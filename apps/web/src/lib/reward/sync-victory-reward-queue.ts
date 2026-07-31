import { validateRewardCardNumber, validateVictoryRewardStars } from "@yugioh/rules";
import type { CardCatalogLookup } from "@yugioh/shared";

import { log } from "../logging.ts";
import type { VictoryRewardQueue } from "./victory-reward-queue.ts";
import type { VictoryRewardRepository } from "./victory-reward-repository.ts";

export type SyncVictoryRewardQueueDeps = Readonly<{
  playerId: string;
  catalog: CardCatalogLookup;
  repository: VictoryRewardRepository;
  queue: VictoryRewardQueue;
}>;

export async function syncVictoryRewardQueue(
  deps: SyncVictoryRewardQueueDeps,
): Promise<{ applied: number; removed: number; remaining: number }> {
  let pending: Awaited<ReturnType<VictoryRewardQueue["listPendingRewards"]>>;
  try {
    pending = await deps.queue.listPendingRewards(deps.playerId);
  } catch (queueError) {
    log("warn", "victory_reward_queue_unavailable", {
      playerId: deps.playerId,
      cause: queueError instanceof Error ? queueError.message : "unknown error",
    });
    const summary = { applied: 0, removed: 0, remaining: 0 };
    log("info", "victory_reward_queue_synced", { playerId: deps.playerId, ...summary });
    return summary;
  }
  const pendingCount = pending.length;
  let applied = 0;
  let removed = 0;
  for (const item of pending) {
    const card = validateRewardCardNumber(item.cardNumber, deps.catalog);
    const stars = validateVictoryRewardStars(item.stars);
    if (!card.ok || !stars.ok) {
      log("warn", "victory_reward_queue_item_discarded", {
        playerId: deps.playerId,
        duelId: item.duelId,
        code: !card.ok ? card.error.code : !stars.ok ? stars.error.code : "unknown",
      });
      await deps.queue.removePendingReward(item.duelId);
      removed += 1;
      continue;
    }
    const result = await deps.repository.apply(
      item.playerId,
      item.duelId,
      item.cardNumber,
      item.stars,
    );
    if (!result.ok) continue;
    await deps.queue.removePendingReward(item.duelId);
    removed += 1;
    if (result.value.applied) applied += 1;
  }
  const summary = { applied, removed, remaining: pendingCount - removed };
  log("info", "victory_reward_queue_synced", { playerId: deps.playerId, ...summary });
  return summary;
}
