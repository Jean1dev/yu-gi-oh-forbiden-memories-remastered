import { CollectionSnapshotSchema, type CollectionSnapshot } from "@yugioh/shared";

import { log } from "../logging.ts";

/**
 * Shared with `../reward/offline-queue.ts` and `../active-deck/cache.ts`: the
 * reward's offline path and the active deck's offline save both write a
 * point-in-time record and a pending-queue entry in the same IndexedDB
 * transaction, which requires opening this same database and listing every
 * involved store name in one `transaction()` call — IndexedDB has no
 * cross-connection transactions. `DATABASE_VERSION` is 3 as of build-deck/F07
 * (spec §5): the upgrade adds `ACTIVE_DECK_CACHE_STORE_NAME` and
 * `ACTIVE_DECK_PENDING_SAVE_STORE_NAME` alongside the two stores build-deck/F03
 * already added.
 */
export const DATABASE_NAME = "yugioh-build-deck";
export const DATABASE_VERSION = 5;
export const STORE_NAME = "collection";
export const PENDING_REWARDS_STORE_NAME = "pendingRewards";
export const ACTIVE_DECK_CACHE_STORE_NAME = "activeDeckCache";
export const ACTIVE_DECK_PENDING_SAVE_STORE_NAME = "activeDeckPendingSave";
export const ROSTER_CACHE_STORE_NAME = "rosterCache";
export const WALLET_BALANCE_STORE_NAME = "walletBalance";
export const PENDING_VICTORY_REWARDS_STORE_NAME = "pendingVictoryRewards";

/** The collection's local-cache port (spec build-deck/F01 §4 `lerSnapshot`/`gravarSnapshot`). */
export type CollectionCache = Readonly<{
  loadSnapshot(playerId: string): Promise<CollectionSnapshot | undefined>;
  saveSnapshot(snapshot: CollectionSnapshot): Promise<void>;
}>;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "playerId" });
      }
      if (!database.objectStoreNames.contains(PENDING_REWARDS_STORE_NAME)) {
        database.createObjectStore(PENDING_REWARDS_STORE_NAME, { keyPath: "duelId" });
      }
      if (!database.objectStoreNames.contains(ACTIVE_DECK_CACHE_STORE_NAME)) {
        database.createObjectStore(ACTIVE_DECK_CACHE_STORE_NAME, { keyPath: "playerId" });
      }
      if (!database.objectStoreNames.contains(ACTIVE_DECK_PENDING_SAVE_STORE_NAME)) {
        database.createObjectStore(ACTIVE_DECK_PENDING_SAVE_STORE_NAME, { keyPath: "playerId" });
      }
      if (!database.objectStoreNames.contains(ROSTER_CACHE_STORE_NAME)) {
        database.createObjectStore(ROSTER_CACHE_STORE_NAME);
      }
      if (!database.objectStoreNames.contains(WALLET_BALANCE_STORE_NAME)) {
        database.createObjectStore(WALLET_BALANCE_STORE_NAME, { keyPath: "playerId" });
      }
      if (!database.objectStoreNames.contains(PENDING_VICTORY_REWARDS_STORE_NAME)) {
        database.createObjectStore(PENDING_VICTORY_REWARDS_STORE_NAME, { keyPath: "duelId" });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open the collection cache database."));
    };
  });
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Collection cache request failed."));
    };
  });
}

async function deleteSnapshot(database: IDBDatabase, playerId: string): Promise<void> {
  const transaction = database.transaction(STORE_NAME, "readwrite");
  await requestToPromise(transaction.objectStore(STORE_NAME).delete(playerId));
}

/**
 * The concrete IndexedDB adapter for the collection snapshot: one record per
 * player, replaced whole on every successful server read (spec
 * build-deck/F01, Decision 6). IndexedDB is treated as an untrusted boundary
 * just like the network (spec §4, `SnapshotColecaoSchema`): a corrupted or
 * old-format record is removed and reported as cache absence instead of
 * crashing the loader (spec §6, "Snapshot de cache corrompido").
 */
export function createIndexedDbCollectionCache(): CollectionCache {
  return {
    async loadSnapshot(playerId) {
      const database = await openDatabase();
      let raw: unknown;
      try {
        const transaction = database.transaction(STORE_NAME, "readonly");
        raw = await requestToPromise(transaction.objectStore(STORE_NAME).get(playerId));
      } finally {
        database.close();
      }

      if (raw === undefined) {
        return undefined;
      }

      const parsed = CollectionSnapshotSchema.safeParse(raw);
      if (!parsed.success) {
        log("warn", "collection_snapshot_invalid", { playerId, issues: parsed.error.issues });
        const cleanupDatabase = await openDatabase();
        try {
          await deleteSnapshot(cleanupDatabase, playerId);
        } finally {
          cleanupDatabase.close();
        }
        return undefined;
      }

      return parsed.data;
    },

    async saveSnapshot(snapshot) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        await requestToPromise(transaction.objectStore(STORE_NAME).put(snapshot));
      } finally {
        database.close();
      }
    },
  };
}
