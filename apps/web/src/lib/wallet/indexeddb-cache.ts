import { WalletBalanceSchema, type WalletBalance } from "@yugioh/shared";

import {
  openDatabase,
  requestToPromise,
  WALLET_BALANCE_STORE_NAME,
} from "../collection/indexeddb-cache.ts";

export type WalletSnapshot = WalletBalance & Readonly<{ syncedAt: string }>;

export type WalletCache = Readonly<{
  loadSnapshot(playerId: string): Promise<WalletSnapshot | undefined>;
  saveSnapshot(snapshot: WalletSnapshot): Promise<void>;
}>;

function parseSnapshot(raw: unknown): WalletSnapshot | undefined {
  if (typeof raw !== "object" || raw === null || !("syncedAt" in raw)) return undefined;
  const parsed = WalletBalanceSchema.safeParse({
    playerId: Reflect.get(raw, "playerId"),
    stars: Reflect.get(raw, "stars"),
  });
  const syncedAt = Reflect.get(raw, "syncedAt");
  if (!parsed.success || typeof syncedAt !== "string" || syncedAt.length === 0) return undefined;
  return { ...parsed.data, syncedAt };
}

export function createIndexedDbWalletCache(): WalletCache {
  return {
    async loadSnapshot(playerId) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(WALLET_BALANCE_STORE_NAME, "readonly");
        const raw = await requestToPromise<unknown>(
          transaction.objectStore(WALLET_BALANCE_STORE_NAME).get(playerId),
        );
        return parseSnapshot(raw);
      } finally {
        database.close();
      }
    },
    async saveSnapshot(snapshot) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(WALLET_BALANCE_STORE_NAME, "readwrite");
        await requestToPromise(transaction.objectStore(WALLET_BALANCE_STORE_NAME).put(snapshot));
      } finally {
        database.close();
      }
    },
  };
}
