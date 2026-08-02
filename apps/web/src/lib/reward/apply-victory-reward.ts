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
import { log } from "../logging.ts";
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
    log("warn", "victory_reward_event_malformed", { issues: parsed.error.issues });
    return err(
      new DomainError("Victory reward event failed validation.", "malformed_victory_reward_event", {
        issues: parsed.error.issues,
      }),
    );
  }
  const { playerId, duelId, cardNumber, stars } = parsed.data;
  const cardValidation = validateRewardCardNumber(cardNumber, deps.catalog);
  if (!cardValidation.ok) {
    log("warn", "victory_reward_apply_failed", {
      playerId,
      duelId,
      cardNumber,
      code: cardValidation.error.code,
    });
    return cardValidation;
  }
  const starsValidation = validateVictoryRewardStars(stars);
  if (!starsValidation.ok) {
    log("warn", "victory_reward_apply_failed", {
      playerId,
      duelId,
      code: starsValidation.error.code,
    });
    return starsValidation;
  }

  let pending: Awaited<ReturnType<VictoryRewardQueue["listPendingRewards"]>> = [];
  try {
    pending = await deps.victoryRewardQueue.listPendingRewards(playerId);
  } catch (queueError) {
    log("warn", "victory_reward_queue_unavailable", {
      playerId,
      cause: queueError instanceof Error ? queueError.message : "unknown error",
    });
  }
  if (pending.some((item) => item.duelId === duelId)) {
    log("info", "victory_reward_apply_finished", {
      playerId,
      duelId,
      status: "already_applied",
      source: "local_queue",
    });
    return ok({ status: "already_applied" });
  }

  log("debug", "victory_reward_apply_started", { playerId, duelId });
  const server = await deps.victoryRewardRepository.apply(playerId, duelId, cardNumber, stars);
  if (server.ok) {
    const { applied, cardQuantity, walletStars } = server.value;
    log("info", "victory_reward_apply_finished", {
      playerId,
      duelId,
      status: applied ? "applied" : "already_applied",
    });
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
    log("warn", "victory_reward_apply_failed", {
      playerId,
      duelId,
      cause: server.error.message,
      fallback: "applied_offline",
    });
    return ok({
      status: "applied_offline",
      localCardQuantity: offline.collection.get(cardNumber) ?? 0,
      localWalletStars: offline.wallet.stars,
    });
  } catch (offlineError) {
    log("warn", "victory_reward_apply_failed", {
      playerId,
      duelId,
      cause: offlineError instanceof Error ? offlineError.message : "unknown error",
      stage: "offline_cache_unavailable",
    });
    return err(
      new DomainError("Victory reward is unavailable online and offline.", "victory_reward_apply_unavailable", {
        duelId,
      }),
    );
  }
}
