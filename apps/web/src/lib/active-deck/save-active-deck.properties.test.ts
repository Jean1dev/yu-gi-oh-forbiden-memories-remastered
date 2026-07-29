import { randomUUID } from "node:crypto";

import type { CachedActiveDeckRecord, Collection, PendingActiveDeckSave } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";

import type { Clock } from "../collection/load-collection.ts";
import type { ActiveDeckCache, PendingActiveDeckSaveQueue } from "./cache.ts";
import { saveActiveDeck } from "./save-active-deck.ts";
import type { ActiveDeckRepository } from "./supabase-repository.ts";

const fixedClock: Clock = { now: () => new Date("2026-07-29T12:00:00.000Z") };

/** A handful of card numbers, quantity capped at 5 each — five cards at most five copies never reaches the 40-card target, so every draft this generates is guaranteed invalid (`insufficient_total`). */
const draftArbitrary = fc
  .array(fc.tuple(fc.constantFrom("001", "002", "003", "004", "005"), fc.integer({ min: 0, max: 5 })), {
    minLength: 0,
    maxLength: 5,
  })
  .map((entries) => new Map(entries.filter(([, quantity]) => quantity > 0)) as Collection);

describe("saveActiveDeck property: never writes cache nor pending when validateDeckDraft reports invalid", () => {
  it("holds for arbitrary drafts that never reach forty cards", async () => {
    await fc.assert(
      fc.asyncProperty(draftArbitrary, draftArbitrary, async (draft, ownedCollection) => {
        const records = new Map<string, CachedActiveDeckRecord>();
        const pending = new Map<string, PendingActiveDeckSave>();
        const cache: ActiveDeckCache = {
          async read(playerId) {
            return records.get(playerId);
          },
          async save(record) {
            records.set(record.playerId, record);
          },
        };
        const pendingSaveQueue: PendingActiveDeckSaveQueue = {
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
        const repository: ActiveDeckRepository = { readActiveDeck: vi.fn(), saveActiveDeck: vi.fn() };
        const playerId = randomUUID();

        const result = await saveActiveDeck(draft, ownedCollection, {
          playerId,
          activeDeckRepository: repository,
          activeDeckCache: cache,
          pendingSaveQueue,
          clock: fixedClock,
          writeOfflineSave: vi.fn(),
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.status).toBe("refused");
        expect(repository.saveActiveDeck).not.toHaveBeenCalled();
        expect(records.size).toBe(0);
        expect(pending.size).toBe(0);
      }),
      { numRuns: 200 },
    );
  });
});
