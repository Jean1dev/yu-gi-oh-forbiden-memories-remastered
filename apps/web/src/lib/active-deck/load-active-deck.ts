import { deserializeCollection, serializeCollection } from "@yugioh/rules";
import { DomainError, err, ok, type LoadedActiveDeck, type Result } from "@yugioh/shared";

import type { ActiveDeckCache, PendingActiveDeckSaveQueue } from "./cache.ts";
import type { ActiveDeckRepository } from "./supabase-repository.ts";
import { syncPendingActiveDeckSave } from "./sync-pending-active-deck-save.ts";

export type LoadActiveDeckDeps = Readonly<{
  activeDeckRepository: ActiveDeckRepository;
  activeDeckCache: ActiveDeckCache;
  pendingSaveQueue: PendingActiveDeckSaveQueue;
}>;

async function loadFromCacheFallback(
  playerId: string,
  deps: LoadActiveDeckDeps,
  cause: DomainError,
): Promise<Result<LoadedActiveDeck, DomainError>> {
  const cached = await deps.activeDeckCache.read(playerId);
  if (cached === undefined) {
    return err(cause);
  }

  const composition = deserializeCollection(cached.cards);
  if (!composition.ok) {
    return composition;
  }

  return ok({
    composition: composition.value,
    updatedAt: cached.updatedAt,
    origin: "cache",
    conflictDetected: false,
  });
}

/**
 * Resolves the active deck to seed the draft (spec build-deck/F07 §3, steps
 * 1-3), superseding the plain RLS read `build-deck`/F05's `useActiveDeck`
 * used to do: server first, cache fallback on network failure, and version
 * conflict detection against the cache — skipped whenever a local pending
 * save exists (Decision 8), since the expected divergence there is lag, not
 * a real conflict. When a pending save is found, this resyncs it once and
 * re-reads before returning, rather than surfacing the stale server value.
 *
 * Returns the `active_deck_pending` `DomainError` when the server explicitly
 * has no row yet for this player (F02 has not produced one) — the caller
 * reuses F02's own "Preparando seu deck inicial…" message for this case,
 * exactly as `useActiveDeck`'s `pending` status already did.
 */
export async function loadActiveDeck(
  playerId: string,
  deps: LoadActiveDeckDeps,
  hasResyncedOnce = false,
): Promise<Result<LoadedActiveDeck, DomainError>> {
  const serverResult = await deps.activeDeckRepository.readActiveDeck(playerId);

  if (!serverResult.ok) {
    return loadFromCacheFallback(playerId, deps, serverResult.error);
  }

  if (serverResult.value === undefined) {
    return err(new DomainError("No active deck exists yet for this player.", "active_deck_pending", { playerId }));
  }

  const pending = await deps.pendingSaveQueue.read(playerId);
  if (pending !== undefined && !hasResyncedOnce) {
    await syncPendingActiveDeckSave(playerId, {
      activeDeckRepository: deps.activeDeckRepository,
      activeDeckCache: deps.activeDeckCache,
      pendingSaveQueue: deps.pendingSaveQueue,
    });
    return loadActiveDeck(playerId, deps, true);
  }

  const cached = await deps.activeDeckCache.read(playerId);
  const conflictDetected =
    pending === undefined && cached !== undefined && cached.updatedAt !== serverResult.value.updatedAt;

  const cards = serializeCollection(serverResult.value.composition);
  await deps.activeDeckCache.save({ playerId, cards, updatedAt: serverResult.value.updatedAt, synced: true });

  return ok({
    composition: serverResult.value.composition,
    updatedAt: serverResult.value.updatedAt,
    origin: "server",
    conflictDetected,
  });
}
