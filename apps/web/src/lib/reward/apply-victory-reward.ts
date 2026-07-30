import {
  deserializeCollection,
  serializeCollection,
  validateRewardCardNumber,
  validateVictoryRewardStars,
} from "@yugioh/rules";
import {
  DomainError,
  VictoryRewardEventSchema,
  err,
  ok,
  type CardCatalogLookup,
  type Result,
  type VictoryRewardResult,
} from "@yugioh/shared";

import type { CollectionCache } from "../collection/indexeddb-cache.ts";
import type { Clock } from "../collection/load-collection.ts";
import type { WalletCache } from "../wallet/indexeddb-cache.ts";
import type {
  OfflineVictoryRewardApplication,
  applyOfflineVictoryReward,
} from "./apply-offline-victory-reward.ts";
import type { VictoryRewardQueue } from "./victory-reward-queue.ts";
import type { VictoryRewardRepository } from "./victory-reward-repository.ts";

export type ApplyVictoryRewardDeps = Readonly<{
  catalog: CardCatalogLookup;
  victoryRewardRepository: VictoryRewardRepository;
  victoryRewardQueue: VictoryRewardQueue;
  collectionCache: CollectionCache;
  walletCache: WalletCache;
  applyOfflineVictoryReward: typeof applyOfflineVictoryReward;
  clock: Clock;
}>;

async function reconcileCaches(
  deps: ApplyVictoryRewardDeps,
  playerId: string,
  cardNumber: string,
  cardQuantity: number,
  walletStars: number,
): Promise<void> {
  const existing = await deps.collectionCache.loadSnapshot(playerId);
  const deserialized = existing === undefined ? undefined : deserializeCollection(existing.entries);
  const collection = new Map(deserialized?.ok ? deserialized.value : []);
  collection.set(cardNumber, cardQuantity);
  const syncedAt = deps.clock.now().toISOString();
  await Promise.all([
    deps.collectionCache.saveSnapshot({
      playerId,
      entries: serializeCollection(collection),
      syncedAt: existing?.syncedAt ?? syncedAt,
    }),
    deps.walletCache.saveSnapshot({ playerId, stars: walletStars, syncedAt }),
  ]);
}

export async function applyVictoryReward(
  event: unknown,
  deps: ApplyVictoryRewardDeps,
): Promise<Result<VictoryRewardResult, DomainError>> {
  const parsed = VictoryRewardEventSchema.safeParse(event);
  if (!parsed.success) {
    return err(new DomainError("Victory reward event failed validation.", "malformed_victory_reward_event"));
  }
  const { playerId, duelId, cardNumber, stars } = parsed.data;
  const cardValidation = validateRewardCardNumber(cardNumber, deps.catalog);
  if (!cardValidation.ok) return cardValidation;
  const starsValidation = validateVictoryRewardStars(stars);
  if (!starsValidation.ok) return starsValidation;

  const pending = await deps.victoryRewardQueue.listPendingRewards(playerId);
  if (pending.some((item) => item.duelId === duelId)) {
    return ok({ status: "already_applied" });
  }

  const server = await deps.victoryRewardRepository.apply(playerId, duelId, cardNumber, stars);
  if (server.ok) {
    const { applied, cardQuantity, walletStars } = server.value;
    if (!applied) {
      await reconcileCaches(deps, playerId, cardNumber, cardQuantity, walletStars);
      return ok({ status: "already_applied", cardQuantity, walletStars });
    }
    return ok({ status: "applied", cardQuantity, walletStars });
  }

  try {
    const application: OfflineVictoryRewardApplication = {
      playerId,
      cardNumber,
      stars,
      pendingReward: {
        playerId,
        duelId,
        cardNumber,
        stars,
        queuedAt: deps.clock.now().toISOString(),
      },
    };
    const offline = await deps.applyOfflineVictoryReward(application);
    return ok({
      status: "applied_offline",
      localCardQuantity: offline.collection.get(cardNumber) ?? 0,
      localWalletStars: offline.wallet.stars,
    });
  } catch {
    return err(
      new DomainError("Victory reward is unavailable online and offline.", "victory_reward_apply_unavailable", {
        duelId,
      }),
    );
  }
}
