import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { DATABASE_NAME } from "../collection/indexeddb-cache.ts";
import { createIndexedDbRosterCache } from "./roster-cache.ts";

const roster = {
  rosterVersion: "1.0.0",
  duelists: [],
  report: {
    declaredDuelists: 0,
    availableDuelists: 0,
    hidden: [],
    observedDropTiers: [],
    missingPortraits: [],
    valid: true,
  },
} as const;

beforeEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
});

describe("IndexedDB roster cache", () => {
  it("round-trips a validated roster", async () => {
    const cache = createIndexedDbRosterCache();
    await cache.write({
      rosterVersion: "1.0.0",
      hash: "hash-one",
      validatedAt: "2026-07-29T00:00:00.000Z",
      roster,
    });
    await expect(cache.read({ rosterVersion: "1.0.0", hash: "hash-one" })).resolves.toEqual(
      roster,
    );
  });

  it("invalidates a version or hash mismatch", async () => {
    const cache = createIndexedDbRosterCache();
    await cache.write({
      rosterVersion: "1.0.0",
      hash: "hash-one",
      validatedAt: "2026-07-29T00:00:00.000Z",
      roster,
    });
    await expect(cache.read({ rosterVersion: "2.0.0", hash: "hash-one" })).resolves.toBeNull();
    await expect(cache.read({ rosterVersion: "1.0.0", hash: "hash-two" })).resolves.toBeNull();
  });
});
