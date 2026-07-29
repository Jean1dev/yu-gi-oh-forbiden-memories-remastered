import type { SyncActiveDeckSummary } from "@yugioh/shared";

import { log } from "../logging.ts";
import type { ActiveDeckCache, PendingActiveDeckSaveQueue } from "./cache.ts";
import type { ActiveDeckRepository } from "./supabase-repository.ts";

export type SyncPendingActiveDeckSaveDeps = Readonly<{
  activeDeckRepository: ActiveDeckRepository;
  activeDeckCache: ActiveDeckCache;
  pendingSaveQueue: PendingActiveDeckSaveQueue;
}>;

/**
 * Resends the queued active-deck save on reconnect (spec build-deck/F07 §3,
 * steps 6-10). Revalidates against the *current* catalog/ownership by simply
 * calling the same `save_active_deck` RPC again — the server re-runs its own
 * structural/ownership checks, so nothing here needs to duplicate them.
 * `invalid_deck` is a definitive refusal (the collection changed
 * incompatibly since the save was queued): the pending entry is dropped
 * instead of retried forever, same spirit as `syncRewardQueue`
 * (build-deck/F03) not re-queuing a `numero` gone invalid since it was
 * queued. Any other repository failure — network or an expired session —
 * keeps the pending entry for the next `online` event (spec Decision 10).
 */
export async function syncPendingActiveDeckSave(
  playerId: string,
  deps: SyncPendingActiveDeckSaveDeps,
): Promise<SyncActiveDeckSummary> {
  const pending = await deps.pendingSaveQueue.read(playerId);
  if (pending === undefined) {
    return { status: "no_pending" };
  }

  const result = await deps.activeDeckRepository.saveActiveDeck(playerId, pending.cards);

  if (result.ok) {
    await deps.activeDeckCache.save({
      playerId,
      cards: pending.cards,
      updatedAt: result.value.updatedAt,
      synced: true,
    });
    await deps.pendingSaveQueue.remove(playerId);
    return { status: "synced", updatedAt: result.value.updatedAt };
  }

  if (result.error.code === "invalid_deck") {
    await deps.pendingSaveQueue.remove(playerId);
    log("warn", "active_deck_sync_refused", { playerId, cause: result.error.message });
    return { status: "refused" };
  }

  log("warn", "active_deck_sync_failed", { playerId, cause: result.error.message, code: result.error.code });
  return result.error.code === "session_expired" ? { status: "session_expired" } : { status: "network_failure" };
}
