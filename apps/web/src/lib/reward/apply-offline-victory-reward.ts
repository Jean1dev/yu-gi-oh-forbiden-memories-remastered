import { deserializeCollection, incrementQuantity, serializeCollection } from "@yugioh/rules";
import {
  CollectionSnapshotSchema,
  WalletBalanceSchema,
  type CardNumber,
  type Collection,
  type PendingVictoryReward,
  type WalletBalance,
} from "@yugioh/shared";

import {
  openDatabase,
  PENDING_VICTORY_REWARDS_STORE_NAME,
  requestToPromise,
  STORE_NAME as COLLECTION_STORE_NAME,
  WALLET_BALANCE_STORE_NAME,
} from "../collection/indexeddb-cache.ts";

export type OfflineVictoryRewardApplication = Readonly<{
  playerId: string;
  cardNumber: CardNumber;
  stars: number;
  pendingReward: PendingVictoryReward;
}>;

export async function applyOfflineVictoryReward(
  application: OfflineVictoryRewardApplication,
): Promise<{ collection: Collection; wallet: WalletBalance }> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [COLLECTION_STORE_NAME, WALLET_BALANCE_STORE_NAME, PENDING_VICTORY_REWARDS_STORE_NAME],
      "readwrite",
    );
    const collectionStore = transaction.objectStore(COLLECTION_STORE_NAME);
    const walletStore = transaction.objectStore(WALLET_BALANCE_STORE_NAME);
    const pendingStore = transaction.objectStore(PENDING_VICTORY_REWARDS_STORE_NAME);

    const rawCollection = await requestToPromise<unknown>(collectionStore.get(application.playerId));
    const parsedCollection = CollectionSnapshotSchema.safeParse(rawCollection);
    const deserialized = parsedCollection.success
      ? deserializeCollection(parsedCollection.data.entries)
      : undefined;
    const baseCollection = deserialized?.ok ? deserialized.value : new Map();
    const collection = incrementQuantity(baseCollection, application.cardNumber);

    const rawWallet = await requestToPromise<unknown>(walletStore.get(application.playerId));
    const parsedWallet = WalletBalanceSchema.safeParse(rawWallet);
    const wallet = {
      playerId: application.playerId,
      stars: (parsedWallet.success ? parsedWallet.data.stars : 0) + application.stars,
    };
    const syncedAt = parsedCollection.success
      ? parsedCollection.data.syncedAt
      : application.pendingReward.queuedAt;

    collectionStore.put({
      playerId: application.playerId,
      entries: serializeCollection(collection),
      syncedAt,
    });
    walletStore.put({ ...wallet, syncedAt });
    pendingStore.put(application.pendingReward);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Offline victory reward failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline victory reward aborted."));
    });
    return { collection, wallet };
  } finally {
    database.close();
  }
}
