import {
  CachedActiveDeckRecordSchema,
  PendingActiveDeckSaveSchema,
  type CachedActiveDeckRecord,
  type PendingActiveDeckSave,
} from "@yugioh/shared";

import {
  openDatabase,
  requestToPromise,
  ACTIVE_DECK_CACHE_STORE_NAME,
  ACTIVE_DECK_PENDING_SAVE_STORE_NAME,
} from "../collection/indexeddb-cache.ts";
import { log } from "../logging.ts";

/** The active deck's local-cache port (spec build-deck/F07 §4 `lerCacheDeckAtivo`/`gravarCacheDeckAtivo`). */
export type ActiveDeckCache = Readonly<{
  read(playerId: string): Promise<CachedActiveDeckRecord | undefined>;
  save(record: CachedActiveDeckRecord): Promise<void>;
}>;

/**
 * The active deck's offline-save queue port — a single slot per player (spec
 * build-deck/F07 §4 `lerPendenciaDeckAtivo`/`gravarPendenciaDeckAtivo`/
 * `removerPendenciaDeckAtivo`, Decision 7): queuing a new save while offline
 * replaces the existing record instead of appending, since there is only ever
 * one active deck to save.
 */
export type PendingActiveDeckSaveQueue = Readonly<{
  read(playerId: string): Promise<PendingActiveDeckSave | undefined>;
  save(pending: PendingActiveDeckSave): Promise<void>;
  remove(playerId: string): Promise<void>;
}>;

/**
 * The concrete IndexedDB adapter for `activeDeckCache`: one record per
 * player, keyed by `playerId` (spec build-deck/F07 §5). Local storage is an
 * untrusted boundary just like the network (same rule
 * `createIndexedDbCollectionCache` already follows): a corrupted or
 * old-format record is discarded and logged instead of crashing the loader.
 */
export function createIndexedDbActiveDeckCache(): ActiveDeckCache {
  return {
    async read(playerId) {
      const database = await openDatabase();
      let raw: unknown;
      try {
        const transaction = database.transaction(ACTIVE_DECK_CACHE_STORE_NAME, "readonly");
        raw = await requestToPromise(transaction.objectStore(ACTIVE_DECK_CACHE_STORE_NAME).get(playerId));
      } finally {
        database.close();
      }

      if (raw === undefined) {
        return undefined;
      }

      const parsed = CachedActiveDeckRecordSchema.safeParse(raw);
      if (!parsed.success) {
        log("warn", "active_deck_cache_invalid", { playerId, issues: parsed.error.issues });
        return undefined;
      }
      return parsed.data;
    },

    async save(record) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(ACTIVE_DECK_CACHE_STORE_NAME, "readwrite");
        await requestToPromise(transaction.objectStore(ACTIVE_DECK_CACHE_STORE_NAME).put(record));
      } finally {
        database.close();
      }
    },
  };
}

/** The concrete IndexedDB adapter for `activeDeckPendingSave` (spec build-deck/F07 §5). */
export function createIndexedDbPendingActiveDeckSaveQueue(): PendingActiveDeckSaveQueue {
  return {
    async read(playerId) {
      const database = await openDatabase();
      let raw: unknown;
      try {
        const transaction = database.transaction(ACTIVE_DECK_PENDING_SAVE_STORE_NAME, "readonly");
        raw = await requestToPromise(transaction.objectStore(ACTIVE_DECK_PENDING_SAVE_STORE_NAME).get(playerId));
      } finally {
        database.close();
      }

      if (raw === undefined) {
        return undefined;
      }

      const parsed = PendingActiveDeckSaveSchema.safeParse(raw);
      if (!parsed.success) {
        log("warn", "active_deck_pending_save_invalid", { playerId, issues: parsed.error.issues });
        return undefined;
      }
      return parsed.data;
    },

    async save(pending) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(ACTIVE_DECK_PENDING_SAVE_STORE_NAME, "readwrite");
        await requestToPromise(transaction.objectStore(ACTIVE_DECK_PENDING_SAVE_STORE_NAME).put(pending));
      } finally {
        database.close();
      }
    },

    async remove(playerId) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(ACTIVE_DECK_PENDING_SAVE_STORE_NAME, "readwrite");
        await requestToPromise(transaction.objectStore(ACTIVE_DECK_PENDING_SAVE_STORE_NAME).delete(playerId));
      } finally {
        database.close();
      }
    },
  };
}

/**
 * Writes the cache record and the pending save in the same IndexedDB
 * transaction — the offline/session-expired paths of `saveActiveDeck` never
 * leave one without the other (spec build-deck/F07 §3, "Cache e pendencia sao
 * escritos atomicamente"), same pattern `applyOfflineReward`
 * (`../reward/offline-queue.ts`) already uses for the reward's own two
 * stores.
 */
export async function writeActiveDeckCacheAndPendingSaveAtomically(
  cacheRecord: CachedActiveDeckRecord,
  pendingSave: PendingActiveDeckSave,
): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [ACTIVE_DECK_CACHE_STORE_NAME, ACTIVE_DECK_PENDING_SAVE_STORE_NAME],
      "readwrite",
    );
    transaction.objectStore(ACTIVE_DECK_CACHE_STORE_NAME).put(cacheRecord);
    transaction.objectStore(ACTIVE_DECK_PENDING_SAVE_STORE_NAME).put(pendingSave);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Active deck offline-save transaction failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Active deck offline-save transaction aborted."));
    });
  } finally {
    database.close();
  }
}
