import { deserializeCollection } from "@yugioh/rules";
import { DomainError, err, ok, type LoadedCollection, type Result } from "@yugioh/shared";

import { log } from "../logging.ts";
import type { CollectionCache } from "./indexeddb-cache.ts";
import type { CollectionRepository } from "./supabase-repository.ts";

export type Clock = Readonly<{
  now(): Date;
}>;

export type LoadCollectionDeps = Readonly<{
  /** Already resolved by the caller (`getAuthenticatedPlayerId`) — `undefined` when there is no session. */
  playerId: string | undefined;
  repository: CollectionRepository;
  cache: CollectionCache;
  clock: Clock;
}>;

/**
 * Orchestrates server read -> cache write -> cache fallback into a single
 * entry point that always reports where the data came from (spec
 * build-deck/F01 §3). Failure of the server read **and** absence of a cached
 * snapshot is a `Result` error, never an empty collection — an empty
 * collection is a legitimate state (a player before F02 seeds it) and
 * conflating it with failure would make the Library mark everything as not
 * obtained (spec Decision 4).
 */
export async function loadCollection(
  deps: LoadCollectionDeps,
): Promise<Result<LoadedCollection, DomainError>> {
  if (deps.playerId === undefined) {
    return err(new DomainError("No authenticated session.", "session_missing"));
  }
  const playerId = deps.playerId;

  const serverResult = await deps.repository(playerId);
  if (serverResult.ok) {
    const collectionResult = deserializeCollection(serverResult.value);
    if (!collectionResult.ok) {
      return collectionResult;
    }

    const syncedAt = deps.clock.now().toISOString();
    try {
      await deps.cache.saveSnapshot({ playerId, entries: serverResult.value, syncedAt });
    } catch (error) {
      log("warn", "collection_snapshot_save_failed", {
        playerId,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }

    return ok({ origin: "server", collection: collectionResult.value, syncedAt });
  }

  let snapshot;
  try {
    snapshot = await deps.cache.loadSnapshot(playerId);
  } catch (error) {
    log("warn", "collection_cache_unavailable", {
      playerId,
      error: error instanceof Error ? error.message : "unknown error",
    });
    snapshot = undefined;
  }

  if (snapshot === undefined) {
    return err(
      new DomainError(
        "Collection unavailable: no server response and no local cache.",
        "collection_unavailable",
        { playerId, serverError: serverResult.error.message },
      ),
    );
  }

  const collectionResult = deserializeCollection(snapshot.entries);
  if (!collectionResult.ok) {
    return collectionResult;
  }

  return ok({ origin: "cache", collection: collectionResult.value, syncedAt: snapshot.syncedAt });
}
