import { deserializeCollection, serializeCollection, validateRewardCardNumber } from "@yugioh/rules";
import {
  CardRewardEventSchema,
  DomainError,
  err,
  ok,
  type CardCatalogLookup,
  type CardNumber,
  type Collection,
  type Result,
  type RewardResult,
} from "@yugioh/shared";

import type { CollectionCache } from "../collection/indexeddb-cache.ts";
import type { Clock } from "../collection/load-collection.ts";
import { log } from "../logging.ts";
import type { OfflineRewardApplication, RewardQueue } from "./offline-queue.ts";
import type { RewardRepository } from "./supabase-repository.ts";

export type RegisterCardRewardDeps = Readonly<{
  catalog: CardCatalogLookup;
  rewardRepository: RewardRepository;
  rewardQueue: RewardQueue;
  collectionCache: CollectionCache;
  applyOfflineReward(application: OfflineRewardApplication): Promise<Collection>;
  clock: Clock;
}>;

async function reconcileCachedQuantity(
  cache: CollectionCache,
  playerId: string,
  cardNumber: CardNumber,
  quantity: number,
  clock: Clock,
): Promise<void> {
  const existing = await cache.loadSnapshot(playerId);
  const deserialized = existing === undefined ? undefined : deserializeCollection(existing.entries);
  const baseCollection: Collection = deserialized?.ok ? deserialized.value : new Map();

  const reconciled = new Map(baseCollection);
  reconciled.set(cardNumber, quantity);

  await cache.saveSnapshot({
    playerId,
    entries: serializeCollection(reconciled),
    syncedAt: existing?.syncedAt ?? clock.now().toISOString(),
  });
}

/**
 * Registers a card reward from a duel module (Free Duel/Online Duel/Campaign,
 * all cross-PRD) — the single entry point they call once the drop is chosen
 * (spec build-deck/F03 §3). `event` is `unknown` because it crosses a
 * cross-PRD boundary: validated here, before any I/O, rather than trusted at
 * the caller's static type (guidelines §18.3).
 *
 * Order of operations mirrors the spec exactly: schema validation, then
 * catalog validation (Decision 7 — an unknown `cardNumber` never reaches
 * `reward_ledger` or `collections`), then the local queue (avoids an
 * unnecessary round-trip for a `duelId` already known locally), then the RPC,
 * falling back to the offline path only on a genuine RPC failure.
 */
export async function registerCardReward(
  event: unknown,
  deps: RegisterCardRewardDeps,
): Promise<Result<RewardResult, DomainError>> {
  const parsedEvent = CardRewardEventSchema.safeParse(event);
  if (!parsedEvent.success) {
    log("warn", "reward_event_malformed", { issues: parsedEvent.error.issues });
    return err(
      new DomainError("Reward event failed validation.", "malformed_reward_event", {
        issues: parsedEvent.error.issues,
      }),
    );
  }
  const { playerId, duelId, cardNumber } = parsedEvent.data;

  const validated = validateRewardCardNumber(cardNumber, deps.catalog);
  if (!validated.ok) {
    log("warn", "reward_apply_failed", { playerId, duelId, cardNumber, code: validated.error.code });
    return validated;
  }

  const pending = await deps.rewardQueue.listPendingRewards(playerId);
  if (pending.some((item) => item.duelId === duelId)) {
    log("info", "reward_apply_finished", { playerId, duelId, status: "already_applied", source: "local_queue" });
    return ok({ status: "already_applied" });
  }

  log("debug", "reward_apply_started", { playerId, duelId });

  const applyResult = await deps.rewardRepository.apply(playerId, duelId, cardNumber);

  if (applyResult.ok) {
    const { applied, currentQuantity } = applyResult.value;
    log("info", "reward_apply_finished", {
      playerId,
      duelId,
      status: applied ? "applied" : "already_applied",
    });

    if (!applied) {
      await reconcileCachedQuantity(deps.collectionCache, playerId, cardNumber, currentQuantity, deps.clock);
      return ok({ status: "already_applied", currentQuantity });
    }
    return ok({ status: "applied", currentQuantity });
  }

  try {
    const updatedCollection = await deps.applyOfflineReward({
      playerId,
      cardNumber,
      pendingReward: { duelId, playerId, cardNumber, queuedAt: deps.clock.now().toISOString() },
    });
    log("warn", "reward_apply_failed", {
      playerId,
      duelId,
      cause: applyResult.error.message,
      fallback: "applied_offline",
    });
    return ok({ status: "applied_offline", localQuantity: updatedCollection.get(cardNumber) ?? 0 });
  } catch (offlineError) {
    log("warn", "reward_apply_failed", {
      playerId,
      duelId,
      cause: offlineError instanceof Error ? offlineError.message : "unknown error",
      stage: "offline_cache_unavailable",
    });
    return err(
      new DomainError(
        "Failed to register the reward: no network and no local cache available.",
        "reward_apply_unavailable",
        { playerId, duelId },
      ),
    );
  }
}
