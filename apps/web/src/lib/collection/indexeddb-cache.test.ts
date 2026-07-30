import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import {
  DATABASE_NAME,
  openDatabase,
  PENDING_VICTORY_REWARDS_STORE_NAME,
  WALLET_BALANCE_STORE_NAME,
} from "./indexeddb-cache.ts";

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

afterEach(deleteDatabase);

describe("openDatabase", () => {
  it("creates the wallet and pending victory reward stores", async () => {
    const database = await openDatabase();
    expect(database.objectStoreNames.contains(WALLET_BALANCE_STORE_NAME)).toBe(true);
    expect(database.objectStoreNames.contains(PENDING_VICTORY_REWARDS_STORE_NAME)).toBe(true);
    database.close();
  });
});
