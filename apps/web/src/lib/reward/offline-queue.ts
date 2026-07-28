import { deserializeCollection, incrementQuantity, serializeCollection } from "@yugioh/rules";
import {
  CollectionSnapshotSchema,
  PendingRewardSchema,
  type CardNumber,
  type Collection,
  type CollectionSnapshot,
  type PendingReward,
} from "@yugioh/shared";

import {
  openDatabase,
  requestToPromise,
  PENDING_REWARDS_STORE_NAME,
  STORE_NAME as COLLECTION_STORE_NAME,
} from "../collection/indexeddb-cache.ts";
import { log } from "../logging.ts";

/** The offline reward queue's local-storage port (spec build-deck/F03 §4). */
export type RewardQueue = Readonly<{
  enqueueReward(pending: PendingReward): Promise<void>;
  listPendingRewards(playerId: string): Promise<readonly PendingReward[]>;
  removePendingReward(duelId: string): Promise<void>;
}>;

/**
 * The concrete IndexedDB adapter for `recompensas_pendentes`: one record per
 * pending reward, keyed by `duelId` — re-queuing the same id replaces the
 * entry, never duplicates it (spec build-deck/F03 §5). Local storage is an
 * untrusted boundary just like the network (same rule
 * `createIndexedDbCollectionCache` already follows): a corrupted or
 * old-format record is discarded and logged instead of crashing the sync.
 */
export function createIndexedDbRewardQueue(): RewardQueue {
  return {
    async enqueueReward(pending) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(PENDING_REWARDS_STORE_NAME, "readwrite");
        await requestToPromise(transaction.objectStore(PENDING_REWARDS_STORE_NAME).put(pending));
      } finally {
        database.close();
      }
    },

    async listPendingRewards(playerId) {
      const database = await openDatabase();
      let raw: unknown[];
      try {
        const transaction = database.transaction(PENDING_REWARDS_STORE_NAME, "readonly");
        raw = await requestToPromise(transaction.objectStore(PENDING_REWARDS_STORE_NAME).getAll());
      } finally {
        database.close();
      }

      const pending: PendingReward[] = [];
      for (const record of raw) {
        const parsed = PendingRewardSchema.safeParse(record);
        if (!parsed.success) {
          log("warn", "pending_reward_invalid", { issues: parsed.error.issues });
          continue;
        }
        if (parsed.data.playerId === playerId) {
          pending.push(parsed.data);
        }
      }

      return Object.freeze(pending.sort((a, b) => (a.queuedAt < b.queuedAt ? -1 : a.queuedAt > b.queuedAt ? 1 : 0)));
    },

    async removePendingReward(duelId) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(PENDING_REWARDS_STORE_NAME, "readwrite");
        await requestToPromise(transaction.objectStore(PENDING_REWARDS_STORE_NAME).delete(duelId));
      } finally {
        database.close();
      }
    },
  };
}

export type OfflineRewardApplication = Readonly<{
  playerId: string;
  cardNumber: CardNumber;
  pendingReward: PendingReward;
}>;

function parseCollectionSnapshot(raw: unknown, playerId: string): CollectionSnapshot | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const parsed = CollectionSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    log("warn", "collection_snapshot_invalid", { playerId, issues: parsed.error.issues });
    return undefined;
  }
  return parsed.data;
}

/**
 * Applies the reward's point increment to the cached collection snapshot and
 * enqueues the pending reward in the same IndexedDB transaction (spec
 * build-deck/F03 §3, step 5 / §5): both stores live in the same database
 * (`../collection/indexeddb-cache.ts`), so a single `transaction()` call
 * spanning both store names is what makes the two local writes atomic with
 * each other. `syncedAt` is preserved from the existing snapshot when there
 * is one — a point increment is not a fresh server sync, just a local patch
 * on top of the last one — and only seeded with the current time when no
 * snapshot exists yet at all.
 */
export async function applyOfflineReward(application: OfflineRewardApplication): Promise<Collection> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction([COLLECTION_STORE_NAME, PENDING_REWARDS_STORE_NAME], "readwrite");
    const collectionStore = transaction.objectStore(COLLECTION_STORE_NAME);
    const pendingStore = transaction.objectStore(PENDING_REWARDS_STORE_NAME);

    const existingRaw = await requestToPromise<unknown>(collectionStore.get(application.playerId));
    const existingSnapshot = parseCollectionSnapshot(existingRaw, application.playerId);
    const deserialized = existingSnapshot === undefined ? undefined : deserializeCollection(existingSnapshot.entries);
    const baseCollection: Collection = deserialized?.ok ? deserialized.value : new Map();

    const updatedCollection = incrementQuantity(baseCollection, application.cardNumber);
    const updatedSnapshot: CollectionSnapshot = {
      playerId: application.playerId,
      entries: serializeCollection(updatedCollection),
      syncedAt: existingSnapshot?.syncedAt ?? new Date().toISOString(),
    };

    collectionStore.put(updatedSnapshot);
    pendingStore.put(application.pendingReward);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Offline reward transaction failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline reward transaction aborted."));
    });

    return updatedCollection;
  } finally {
    database.close();
  }
}
