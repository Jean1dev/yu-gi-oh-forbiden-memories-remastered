import { reconcileWalletBalance } from "@yugioh/rules";
import {
  DomainError,
  err,
  ok,
  type LoadedWalletBalance,
  type PendingVictoryReward,
  type Result,
} from "@yugioh/shared";

import type { Clock } from "../collection/load-collection.ts";
import type { VictoryRewardQueue } from "../reward/victory-reward-queue.ts";
import type { AppliedRewardsRepository } from "./applied-rewards-repository.ts";
import type { WalletCache } from "./indexeddb-cache.ts";
import type { WalletRepository } from "./supabase-repository.ts";

export type LoadWalletBalanceDeps = Readonly<{
  playerId: string | undefined;
  repository: WalletRepository;
  cache: WalletCache;
  queue: VictoryRewardQueue;
  appliedRewards: AppliedRewardsRepository;
  clock: Clock;
}>;

export async function loadWalletBalance(
  deps: LoadWalletBalanceDeps,
): Promise<Result<LoadedWalletBalance, DomainError>> {
  if (deps.playerId === undefined) {
    return err(new DomainError("No authenticated session.", "session_missing"));
  }
  const server = await deps.repository.load(deps.playerId);
  if (server.ok) {
    const syncedAt = deps.clock.now().toISOString();
    let pending: readonly PendingVictoryReward[] = [];
    try {
      pending = [...(await deps.queue.listPendingRewards(deps.playerId))];
    } catch {
      // The authoritative server balance remains safe when IndexedDB is unavailable.
    }
    let appliedDuelIds: ReadonlySet<string> = new Set(pending.map((reward) => reward.duelId));
    if (pending.length > 0) {
      const applied = await deps.appliedRewards.listApplied(
        deps.playerId,
        pending.map((reward) => reward.duelId),
      );
      if (applied.ok) appliedDuelIds = applied.value;
    }
    const reconciled = reconcileWalletBalance({
      origin: "server",
      persistedStars: server.value.stars,
      pending,
      appliedDuelIds,
    });
    if (!reconciled.ok) {
      return err(new DomainError("Wallet response failed reconciliation.", "wallet_unavailable"));
    }
    try {
      await deps.cache.saveSnapshot({
        playerId: deps.playerId,
        stars: reconciled.value.effectiveStars,
        syncedAt,
      });
    } catch {
      // A server result remains usable when the cache is unavailable.
    }
    return ok({
      origin: "server",
      stars: server.value.stars,
      effectiveStars: reconciled.value.effectiveStars,
      pendingStars: reconciled.value.pendingStars,
      pendingDuelIds: reconciled.value.pendingDuelIds,
      syncedAt,
    });
  }
  try {
    const cached = await deps.cache.loadSnapshot(deps.playerId);
    if (cached !== undefined) {
      return ok({
        origin: "cache",
        stars: cached.stars,
        effectiveStars: cached.stars,
        pendingStars: 0,
        pendingDuelIds: [],
        syncedAt: cached.syncedAt,
      });
    }
  } catch {
    // Report one stable boundary error below.
  }
  return err(new DomainError("Wallet unavailable.", "wallet_unavailable", { playerId: deps.playerId }));
}
