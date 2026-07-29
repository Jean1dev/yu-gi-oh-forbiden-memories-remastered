import "fake-indexeddb/auto";

import { randomUUID } from "node:crypto";

import type { CachedActiveDeckRecord, PendingActiveDeckSave } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import {
  createIndexedDbActiveDeckCache,
  createIndexedDbPendingActiveDeckSaveQueue,
  writeActiveDeckCacheAndPendingSaveAtomically,
} from "./cache.ts";

function cachedRecord(overrides: Partial<CachedActiveDeckRecord> = {}): CachedActiveDeckRecord {
  return {
    playerId: randomUUID(),
    cards: { "001": 3 },
    updatedAt: "2026-07-29T12:00:00.000Z",
    synced: true,
    ...overrides,
  };
}

function pendingSave(overrides: Partial<PendingActiveDeckSave> = {}): PendingActiveDeckSave {
  return {
    playerId: randomUUID(),
    cards: { "001": 3 },
    queuedAt: "2026-07-29T12:00:00.000Z",
    ...overrides,
  };
}

describe("createIndexedDbActiveDeckCache", () => {
  it("read returns undefined when no record has been saved for the player", async () => {
    const cache = createIndexedDbActiveDeckCache();
    expect(await cache.read(randomUUID())).toBeUndefined();
  });

  it("save then read round-trips the record, keyed by playerId", async () => {
    const cache = createIndexedDbActiveDeckCache();
    const playerId = randomUUID();
    await cache.save(cachedRecord({ playerId, cards: { "001": 2, "045": 1 }, synced: false }));

    const read = await cache.read(playerId);
    expect(read?.cards).toEqual({ "001": 2, "045": 1 });
    expect(read?.synced).toBe(false);
  });

  it("saving again for the same playerId overwrites instead of duplicating", async () => {
    const cache = createIndexedDbActiveDeckCache();
    const playerId = randomUUID();
    await cache.save(cachedRecord({ playerId, updatedAt: "2026-07-29T12:00:00.000Z" }));
    await cache.save(cachedRecord({ playerId, updatedAt: "2026-07-29T13:00:00.000Z" }));

    const read = await cache.read(playerId);
    expect(read?.updatedAt).toBe("2026-07-29T13:00:00.000Z");
  });
});

describe("createIndexedDbPendingActiveDeckSaveQueue", () => {
  it("read returns undefined when there is no pending save for the player", async () => {
    const queue = createIndexedDbPendingActiveDeckSaveQueue();
    expect(await queue.read(randomUUID())).toBeUndefined();
  });

  it("queuing a new save for the same player replaces the previous one, never appends", async () => {
    const queue = createIndexedDbPendingActiveDeckSaveQueue();
    const playerId = randomUUID();
    await queue.save(pendingSave({ playerId, cards: { "001": 1 }, queuedAt: "2026-07-29T12:00:00.000Z" }));
    await queue.save(pendingSave({ playerId, cards: { "001": 2 }, queuedAt: "2026-07-29T12:00:05.000Z" }));

    const read = await queue.read(playerId);
    expect(read?.cards).toEqual({ "001": 2 });
    expect(read?.queuedAt).toBe("2026-07-29T12:00:05.000Z");
  });

  it("remove clears the pending save so a later read reports none", async () => {
    const queue = createIndexedDbPendingActiveDeckSaveQueue();
    const playerId = randomUUID();
    await queue.save(pendingSave({ playerId }));
    await queue.remove(playerId);

    expect(await queue.read(playerId)).toBeUndefined();
  });
});

describe("writeActiveDeckCacheAndPendingSaveAtomically", () => {
  it("writes both the cache record and the pending save together", async () => {
    const playerId = randomUUID();
    await writeActiveDeckCacheAndPendingSaveAtomically(
      cachedRecord({ playerId, cards: { "001": 1 }, synced: false }),
      pendingSave({ playerId, cards: { "001": 1 } }),
    );

    const cache = createIndexedDbActiveDeckCache();
    const queue = createIndexedDbPendingActiveDeckSaveQueue();
    expect((await cache.read(playerId))?.synced).toBe(false);
    expect((await queue.read(playerId))?.cards).toEqual({ "001": 1 });
  });
});
