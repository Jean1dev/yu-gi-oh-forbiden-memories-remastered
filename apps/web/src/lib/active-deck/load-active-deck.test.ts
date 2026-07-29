import { randomUUID } from "node:crypto";

import { DomainError, err, ok, type CachedActiveDeckRecord, type Collection, type PendingActiveDeckSave } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { ActiveDeckCache, PendingActiveDeckSaveQueue } from "./cache.ts";
import { loadActiveDeck } from "./load-active-deck.ts";
import type { ActiveDeckRepository } from "./supabase-repository.ts";

function fakeCache(seed?: CachedActiveDeckRecord): ActiveDeckCache & { records: Map<string, CachedActiveDeckRecord> } {
  const records = new Map<string, CachedActiveDeckRecord>();
  if (seed) records.set(seed.playerId, seed);
  return {
    records,
    async read(playerId) {
      return records.get(playerId);
    },
    async save(record) {
      records.set(record.playerId, record);
    },
  };
}

function fakePendingQueue(
  seed?: PendingActiveDeckSave,
): PendingActiveDeckSaveQueue & { pending: Map<string, PendingActiveDeckSave> } {
  const pending = new Map<string, PendingActiveDeckSave>();
  if (seed) pending.set(seed.playerId, seed);
  return {
    pending,
    async read(playerId) {
      return pending.get(playerId);
    },
    async save(record) {
      pending.set(record.playerId, record);
    },
    async remove(playerId) {
      pending.delete(playerId);
    },
  };
}

describe("loadActiveDeck", () => {
  it("adopts the server version and flags a conflict when updatedAt diverges from the cache with no pending save", async () => {
    const playerId = randomUUID();
    const composition: Collection = new Map([["001", 2]]);
    const cache = fakeCache({ playerId, cards: { "001": 1 }, updatedAt: "2026-07-29T10:00:00.000Z", synced: true });
    const pendingQueue = fakePendingQueue();
    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(async () => ok({ composition, updatedAt: "2026-07-29T11:00:00.000Z" })),
      saveActiveDeck: vi.fn(),
    };

    const result = await loadActiveDeck(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("server");
    expect(result.value.conflictDetected).toBe(true);
    expect(result.value.updatedAt).toBe("2026-07-29T11:00:00.000Z");
    expect(cache.records.get(playerId)?.updatedAt).toBe("2026-07-29T11:00:00.000Z");
  });

  it("does not flag a conflict when a local pending save exists, even though the cache and server updatedAt diverge", async () => {
    const playerId = randomUUID();
    const composition: Collection = new Map([["001", 2]]);
    const serverState = { updatedAt: "2026-07-29T10:00:00.000Z" };
    const cache = fakeCache({ playerId, cards: { "001": 1 }, updatedAt: "2026-07-29T09:00:00.000Z", synced: false });
    const pendingQueue = fakePendingQueue({ playerId, cards: { "001": 2 }, queuedAt: "2026-07-29T09:30:00.000Z" });

    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(async () => ok({ composition, updatedAt: serverState.updatedAt })),
      saveActiveDeck: vi.fn(async () => {
        serverState.updatedAt = "2026-07-29T10:00:05.000Z";
        return ok({ updatedAt: serverState.updatedAt });
      }),
    };

    const result = await loadActiveDeck(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.conflictDetected).toBe(false);
    expect(pendingQueue.pending.has(playerId)).toBe(false);
    expect(repository.saveActiveDeck).toHaveBeenCalledOnce();
  });

  it("falls back to the local cache when the server is unreachable", async () => {
    const playerId = randomUUID();
    const cache = fakeCache({ playerId, cards: { "001": 3 }, updatedAt: "2026-07-29T08:00:00.000Z", synced: true });
    const pendingQueue = fakePendingQueue();
    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(async () => err(new DomainError("network down", "active_deck_unavailable"))),
      saveActiveDeck: vi.fn(),
    };

    const result = await loadActiveDeck(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origin).toBe("cache");
    expect(result.value.conflictDetected).toBe(false);
    expect(result.value.composition.get("001")).toBe(3);
  });

  it("returns active_deck_pending when the server has no row yet for the player", async () => {
    const playerId = randomUUID();
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue();
    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(async () => ok(undefined)),
      saveActiveDeck: vi.fn(),
    };

    const result = await loadActiveDeck(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("active_deck_pending");
  });
});
