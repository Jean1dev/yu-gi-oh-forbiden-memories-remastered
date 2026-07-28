import type { CollectionSnapshot, Result, SerializedCollection } from "@yugioh/shared";
import { DomainError, err, ok } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import type { CollectionCache } from "./indexeddb-cache.ts";
import { loadCollection, type Clock, type LoadCollectionDeps } from "./load-collection.ts";
import type { CollectionRepository } from "./supabase-repository.ts";

const FIXED_NOW = new Date("2026-07-27T12:00:00.000Z");
const fixedClock: Clock = { now: () => FIXED_NOW };

function fakeRepository(result: Result<SerializedCollection, DomainError>): CollectionRepository {
  return async () => result;
}

function fakeCache(initial?: CollectionSnapshot): CollectionCache & { readonly saved: CollectionSnapshot[] } {
  let stored = initial;
  const saved: CollectionSnapshot[] = [];
  return {
    saved,
    async loadSnapshot() {
      return stored;
    },
    async saveSnapshot(snapshot) {
      stored = snapshot;
      saved.push(snapshot);
    },
  };
}

function baseDeps(overrides: Partial<LoadCollectionDeps> = {}): LoadCollectionDeps {
  return {
    playerId: "player-1",
    repository: fakeRepository(ok({ "001": 3 })),
    cache: fakeCache(),
    clock: fixedClock,
    ...overrides,
  };
}

describe("loadCollection", () => {
  it("returns origin server when the remote read succeeds", async () => {
    const result = await loadCollection(baseDeps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("server");
    expect(result.value.collection.get("001")).toBe(3);
  });

  it("saves the snapshot after a successful remote read", async () => {
    const cache = fakeCache();
    await loadCollection(baseDeps({ cache }));
    expect(cache.saved).toHaveLength(1);
    expect(cache.saved[0]).toEqual({
      playerId: "player-1",
      entries: { "001": 3 },
      syncedAt: FIXED_NOW.toISOString(),
    });
  });

  it("returns origin cache when the remote read fails and a snapshot exists", async () => {
    const snapshot: CollectionSnapshot = {
      playerId: "player-1",
      entries: { "045": 1 },
      syncedAt: "2026-07-01T00:00:00.000Z",
    };
    const result = await loadCollection(
      baseDeps({
        repository: fakeRepository(err(new DomainError("network down", "collection_unavailable"))),
        cache: fakeCache(snapshot),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("cache");
    expect(result.value.collection.get("045")).toBe(1);
  });

  it("preserves the snapshot's syncedAt on the cache branch", async () => {
    const snapshot: CollectionSnapshot = {
      playerId: "player-1",
      entries: { "045": 1 },
      syncedAt: "2026-07-01T00:00:00.000Z",
    };
    const result = await loadCollection(
      baseDeps({
        repository: fakeRepository(err(new DomainError("network down", "collection_unavailable"))),
        cache: fakeCache(snapshot),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.syncedAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("fails with collection_unavailable when there is no server and no cache", async () => {
    const result = await loadCollection(
      baseDeps({
        repository: fakeRepository(err(new DomainError("network down", "collection_unavailable"))),
        cache: fakeCache(undefined),
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("collection_unavailable");
  });

  it("never returns an empty collection when the remote read fails", async () => {
    const result = await loadCollection(
      baseDeps({
        repository: fakeRepository(err(new DomainError("network down", "collection_unavailable"))),
        cache: fakeCache(undefined),
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("fails with session_missing when there is no authenticated player", async () => {
    const result = await loadCollection(baseDeps({ playerId: undefined }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("session_missing");
  });

  it("returns origin server even when writing the snapshot fails", async () => {
    const cache: CollectionCache = {
      loadSnapshot: async () => undefined,
      saveSnapshot: async () => {
        throw new Error("quota exceeded");
      },
    };
    const result = await loadCollection(baseDeps({ cache }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("server");
  });

  it("treats a cache reported as absent (already cleaned up after corruption) the same as no cache", async () => {
    const result = await loadCollection(
      baseDeps({
        repository: fakeRepository(err(new DomainError("network down", "collection_unavailable"))),
        cache: fakeCache(undefined),
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("collection_unavailable");
  });

  it("returns an empty collection with origin server when the player owns no cards", async () => {
    const result = await loadCollection(baseDeps({ repository: fakeRepository(ok({})) }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("server");
    expect(result.value.collection.size).toBe(0);
  });
});
