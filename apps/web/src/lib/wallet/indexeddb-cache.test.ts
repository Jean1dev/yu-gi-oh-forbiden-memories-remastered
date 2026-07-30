import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { DATABASE_NAME } from "../collection/indexeddb-cache.ts";
import { createIndexedDbWalletCache } from "./indexeddb-cache.ts";

afterEach(
  () =>
    new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.onsuccess = () => resolve();
    }),
);

describe("createIndexedDbWalletCache", () => {
  it("round-trips a wallet snapshot", async () => {
    const cache = createIndexedDbWalletCache();
    const snapshot = { playerId: "player", stars: 9, syncedAt: "now" };
    await cache.saveSnapshot(snapshot);
    expect(await cache.loadSnapshot("player")).toEqual(snapshot);
  });
});
