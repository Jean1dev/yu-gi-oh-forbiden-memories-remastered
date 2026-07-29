import { randomUUID } from "node:crypto";

import { DomainError, err, ok, type CachedActiveDeckRecord, type PendingActiveDeckSave } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { ActiveDeckCache, PendingActiveDeckSaveQueue } from "./cache.ts";
import { syncPendingActiveDeckSave } from "./sync-pending-active-deck-save.ts";
import type { ActiveDeckRepository } from "./supabase-repository.ts";

function fakeCache(): ActiveDeckCache & { records: Map<string, CachedActiveDeckRecord> } {
  const records = new Map<string, CachedActiveDeckRecord>();
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

describe("syncPendingActiveDeckSave", () => {
  it("is a no-op when there is no pending save for the player", async () => {
    const playerId = randomUUID();
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue();
    const repository: ActiveDeckRepository = { readActiveDeck: vi.fn(), saveActiveDeck: vi.fn() };

    const summary = await syncPendingActiveDeckSave(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(summary).toEqual({ status: "no_pending" });
    expect(repository.saveActiveDeck).not.toHaveBeenCalled();
  });

  it("removes the pending save and updates the cache when the RPC confirms", async () => {
    const playerId = randomUUID();
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue({ playerId, cards: { "001": 3 }, queuedAt: "2026-07-29T09:00:00.000Z" });
    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(),
      saveActiveDeck: vi.fn(async () => ok({ updatedAt: "2026-07-29T09:00:05.000Z" })),
    };

    const summary = await syncPendingActiveDeckSave(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(summary).toEqual({ status: "synced", updatedAt: "2026-07-29T09:00:05.000Z" });
    expect(pendingQueue.pending.has(playerId)).toBe(false);
    expect(cache.records.get(playerId)?.synced).toBe(true);
  });

  it("keeps the pending save when the network fails again", async () => {
    const playerId = randomUUID();
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue({ playerId, cards: { "001": 3 }, queuedAt: "2026-07-29T09:00:00.000Z" });
    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(),
      saveActiveDeck: vi.fn(async () => err(new DomainError("network down", "active_deck_save_unavailable"))),
    };

    const summary = await syncPendingActiveDeckSave(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(summary).toEqual({ status: "network_failure" });
    expect(pendingQueue.pending.has(playerId)).toBe(true);
  });

  it("keeps the pending save and reports session_expired distinctly from a generic network failure", async () => {
    const playerId = randomUUID();
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue({ playerId, cards: { "001": 3 }, queuedAt: "2026-07-29T09:00:00.000Z" });
    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(),
      saveActiveDeck: vi.fn(async () => err(new DomainError("jwt expired", "session_expired"))),
    };

    const summary = await syncPendingActiveDeckSave(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(summary).toEqual({ status: "session_expired" });
    expect(pendingQueue.pending.has(playerId)).toBe(true);
  });

  it("removes the pending save without retrying when the refusal is definitive", async () => {
    const playerId = randomUUID();
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue({ playerId, cards: { "001": 3 }, queuedAt: "2026-07-29T09:00:00.000Z" });
    const repository: ActiveDeckRepository = {
      readActiveDeck: vi.fn(),
      saveActiveDeck: vi.fn(async () => err(new DomainError("invalid deck", "invalid_deck"))),
    };

    const summary = await syncPendingActiveDeckSave(playerId, {
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
    });

    expect(summary).toEqual({ status: "refused" });
    expect(pendingQueue.pending.has(playerId)).toBe(false);
  });
});
