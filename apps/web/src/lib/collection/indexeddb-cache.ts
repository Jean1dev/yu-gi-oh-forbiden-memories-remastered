import { CollectionSnapshotSchema, type CollectionSnapshot } from "@yugioh/shared";

import { log } from "../logging.ts";

const DATABASE_NAME = "yugioh-build-deck";
const DATABASE_VERSION = 1;
const STORE_NAME = "collection";

/** The collection's local-cache port (spec build-deck/F01 §4 `lerSnapshot`/`gravarSnapshot`). */
export type CollectionCache = Readonly<{
  loadSnapshot(playerId: string): Promise<CollectionSnapshot | undefined>;
  saveSnapshot(snapshot: CollectionSnapshot): Promise<void>;
}>;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "playerId" });
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

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
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
