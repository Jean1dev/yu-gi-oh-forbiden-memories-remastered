import { randomUUID } from "node:crypto";

import { DomainError, err, ok, type CachedActiveDeckRecord, type Collection, type PendingActiveDeckSave } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { Clock } from "../collection/load-collection.ts";
import type { ActiveDeckCache, PendingActiveDeckSaveQueue } from "./cache.ts";
import { saveActiveDeck } from "./save-active-deck.ts";
import type { ActiveDeckRepository } from "./supabase-repository.ts";

const fixedClock: Clock = { now: () => new Date("2026-07-29T12:00:00.000Z") };

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

function fakePendingQueue(): PendingActiveDeckSaveQueue & { pending: Map<string, PendingActiveDeckSave> } {
  const pending = new Map<string, PendingActiveDeckSave>();
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

function fakeRepository(
  saveActiveDeckImpl: ActiveDeckRepository["saveActiveDeck"],
): ActiveDeckRepository {
  return { readActiveDeck: vi.fn(), saveActiveDeck: saveActiveDeckImpl };
}

/** 13 distinct card numbers at 3 copies plus one at 1 copy — sums to exactly 40, valid and fully owned. */
function validDeckComposition(): Collection {
  const entries: [string, number][] = [];
  for (let i = 1; i <= 13; i += 1) {
    entries.push([String(i).padStart(3, "0"), 3]);
  }
  entries.push(["014", 1]);
  return new Map(entries);
}

const VALID_DRAFT: Collection = validDeckComposition();
const OWNED: Collection = validDeckComposition();

describe("saveActiveDeck", () => {
  it("refuses without writing when validateDeckDraft reports a violation even though the button was enabled", async () => {
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue();
    const repository = fakeRepository(vi.fn());
    const playerId = randomUUID();

    const result = await saveActiveDeck(new Map([["001", 1]]), new Map(), {
      playerId,
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
      clock: fixedClock,
      writeOfflineSave: vi.fn(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ status: "refused", reason: "invalid_deck" });
    expect(repository.saveActiveDeck).not.toHaveBeenCalled();
    expect(cache.records.size).toBe(0);
    expect(pendingQueue.pending.size).toBe(0);
  });

  it("returns saved with the RPC's updatedAt when the online call succeeds", async () => {
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue();
    const playerId = randomUUID();
    pendingQueue.pending.set(playerId, { playerId, cards: { "001": 1 }, queuedAt: "2026-07-29T00:00:00.000Z" });

    const repository = fakeRepository(async () => ok({ updatedAt: "2026-07-29T12:00:05.000Z" }));

    const result = await saveActiveDeck(VALID_DRAFT, OWNED, {
      playerId,
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
      clock: fixedClock,
      writeOfflineSave: vi.fn(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ status: "saved", updatedAt: "2026-07-29T12:00:05.000Z" });
    expect(cache.records.get(playerId)?.synced).toBe(true);
    expect(pendingQueue.pending.has(playerId)).toBe(false);
  });

  it("writes the cache and the pending save atomically when the network fails", async () => {
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue();
    const playerId = randomUUID();
    const writeOfflineSave = vi.fn(async (cacheRecord: CachedActiveDeckRecord, pendingSave: PendingActiveDeckSave) => {
      cache.records.set(cacheRecord.playerId, cacheRecord);
      pendingQueue.pending.set(pendingSave.playerId, pendingSave);
    });

    const repository = fakeRepository(async () =>
      err(new DomainError("network down", "active_deck_save_unavailable")),
    );

    const result = await saveActiveDeck(VALID_DRAFT, OWNED, {
      playerId,
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
      clock: fixedClock,
      writeOfflineSave,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ status: "saved_offline" });
    expect(writeOfflineSave).toHaveBeenCalledOnce();
    expect(cache.records.get(playerId)?.synced).toBe(false);
    expect(pendingQueue.pending.get(playerId)?.cards["014"]).toBe(1);
  });

  it("returns session_expired while keeping the pending save when the RPC denies authorization", async () => {
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue();
    const playerId = randomUUID();
    const writeOfflineSave = vi.fn(async (cacheRecord: CachedActiveDeckRecord, pendingSave: PendingActiveDeckSave) => {
      cache.records.set(cacheRecord.playerId, cacheRecord);
      pendingQueue.pending.set(pendingSave.playerId, pendingSave);
    });

    const repository = fakeRepository(async () => err(new DomainError("jwt expired", "session_expired")));

    const result = await saveActiveDeck(VALID_DRAFT, OWNED, {
      playerId,
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
      clock: fixedClock,
      writeOfflineSave,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ status: "session_expired" });
    expect(pendingQueue.pending.has(playerId)).toBe(true);
  });

  it("returns the persistence_unavailable error when both the network and the local write fail", async () => {
    const cache = fakeCache();
    const pendingQueue = fakePendingQueue();
    const playerId = randomUUID();
    const repository = fakeRepository(async () =>
      err(new DomainError("network down", "active_deck_save_unavailable")),
    );

    const result = await saveActiveDeck(VALID_DRAFT, OWNED, {
      playerId,
      activeDeckRepository: repository,
      activeDeckCache: cache,
      pendingSaveQueue: pendingQueue,
      clock: fixedClock,
      writeOfflineSave: vi.fn().mockRejectedValue(new Error("IndexedDB unavailable")),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("deck_persistence_unavailable");
  });
});
