import { validateRewardCardNumber, validateVictoryRewardStars } from "@yugioh/rules";
import type { CardCatalogLookup } from "@yugioh/shared";

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
  const pending = await deps.queue.listPendingRewards(deps.playerId);
  let applied = 0;
  let removed = 0;
  for (const item of pending) {
    const card = validateRewardCardNumber(item.cardNumber, deps.catalog);
    const stars = validateVictoryRewardStars(item.stars);
    if (!card.ok || !stars.ok) {
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
  return { applied, removed, remaining: pending.length - removed };
}
