import { serializeCollection, validateDeckDraft } from "@yugioh/rules";
import {
  DomainError,
  err,
  ok,
  type CachedActiveDeckRecord,
  type Collection,
  type DeckDraft,
  type PendingActiveDeckSave,
  type Result,
  type SaveActiveDeckResult,
} from "@yugioh/shared";

import type { Clock } from "../collection/load-collection.ts";
import { log } from "../logging.ts";
import type { ActiveDeckCache, PendingActiveDeckSaveQueue } from "./cache.ts";
import type { ActiveDeckRepository } from "./supabase-repository.ts";

export type SaveActiveDeckDeps = Readonly<{
  playerId: string;
  activeDeckRepository: ActiveDeckRepository;
  activeDeckCache: ActiveDeckCache;
  pendingSaveQueue: PendingActiveDeckSaveQueue;
  clock: Clock;
  /** Injected so tests can simulate "no local storage available either" without touching real IndexedDB (same shape as `applyOfflineReward` in build-deck/F03's `registerCardReward`). */
  writeOfflineSave(cacheRecord: CachedActiveDeckRecord, pendingSave: PendingActiveDeckSave): Promise<void>;
}>;

/**
 * Saves the deck currently in edition as the player's active deck (spec
 * build-deck/F07 §3, steps 4-5). Revalidates with `validateDeckDraft`
 * (build-deck/F06) before any I/O (Decision 9) — never trusts that "Salvar
 * deck" being enabled in the UI reflects the current draft. A structural or
 * ownership refusal from the RPC itself (`invalid_deck`, defense in depth,
 * Decisions 5-6) is reported the same way as a local revalidation failure:
 * nothing is written either way. Network failure or an expired session both
 * fall back to `deps.writeOfflineSave` (production wiring passes
 * `writeActiveDeckCacheAndPendingSaveAtomically`, `./cache.ts`) — the only
 * difference is which status is returned, so the UI can tell the player
 * which message to show (spec Decision 10).
 */
export async function saveActiveDeck(
  draft: DeckDraft,
  ownedCollection: Collection,
  deps: SaveActiveDeckDeps,
): Promise<Result<SaveActiveDeckResult, DomainError>> {
  const validation = validateDeckDraft(draft, ownedCollection);
  if (!validation.valid) {
    log("info", "active_deck_save_refused", { playerId: deps.playerId, violationCount: validation.violations.length });
    return ok({ status: "refused", reason: "invalid_deck" });
  }

  const cards = serializeCollection(draft);
  const result = await deps.activeDeckRepository.saveActiveDeck(deps.playerId, cards);

  if (result.ok) {
    await deps.activeDeckCache.save({
      playerId: deps.playerId,
      cards,
      updatedAt: result.value.updatedAt,
      synced: true,
    });
    // Clears any stale pending save left over from an earlier offline attempt — shouldn't exist by now, cleaned up defensively.
    await deps.pendingSaveQueue.remove(deps.playerId);
    return ok({ status: "saved", updatedAt: result.value.updatedAt });
  }

  if (result.error.code === "invalid_deck") {
    log("warn", "active_deck_save_refused", { playerId: deps.playerId, cause: result.error.message, stage: "rpc" });
    return ok({ status: "refused", reason: "invalid_deck" });
  }

  const queuedAt = deps.clock.now().toISOString();
  try {
    await deps.writeOfflineSave(
      { playerId: deps.playerId, cards, updatedAt: queuedAt, synced: false },
      { playerId: deps.playerId, cards, queuedAt },
    );
  } catch (cacheError) {
    log("warn", "active_deck_save_failed", {
      playerId: deps.playerId,
      cause: cacheError instanceof Error ? cacheError.message : "unknown error",
      stage: "offline_cache_unavailable",
    });
    return err(
      new DomainError(
        "Failed to save the active deck: no network and no local cache available.",
        "deck_persistence_unavailable",
        { playerId: deps.playerId },
      ),
    );
  }

  log("warn", "active_deck_save_failed", { playerId: deps.playerId, cause: result.error.message, stage: "queued_offline" });
  return result.error.code === "session_expired" ? ok({ status: "session_expired" }) : ok({ status: "saved_offline" });
}
