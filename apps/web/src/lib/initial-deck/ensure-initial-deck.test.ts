import { ok, type Collection, type DomainError, type Result } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { CatalogAndPool } from "./catalog-adapter.ts";
import { ensureInitialDeck, type EnsureInitialDeckDeps } from "./ensure-initial-deck.ts";
import type { InitialDeckRepository, InitialDeckResult } from "./supabase-repository.ts";

function fakeCatalogAndPool(numbers: readonly string[]): CatalogAndPool {
  return {
    catalog: (numero) => (numbers.includes(numero) ? { numero } as never : undefined),
    poolLookup: () => numbers,
  };
}

const FOURTEEN_NUMBERS = Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(3, "0"));

function buildDeps(overrides: {
  repository: InitialDeckRepository;
  loadCatalog?: () => Promise<Result<CatalogAndPool, DomainError>>;
}): EnsureInitialDeckDeps {
  return {
    playerId: "player-1",
    repository: overrides.repository,
    randomSource: { nextInt: (n) => n - 1 },
    loadCatalog: overrides.loadCatalog ?? (async () => ok(fakeCatalogAndPool(FOURTEEN_NUMBERS))),
  };
}

describe("ensureInitialDeck", () => {
  it("generates and persists a deck when no active_decks row exists for the player", async () => {
    const existingDeck: Collection = new Map();
    const persistedDeck: Collection = new Map([["001", 3]]);
    const persist = vi.fn(
      async (): Promise<Result<InitialDeckResult, DomainError>> =>
        ok({ deck: persistedDeck, createdNow: true }),
    );
    const repository: InitialDeckRepository = {
      readExisting: async () => ok(undefined),
      persist,
    };
    void existingDeck;

    const result = await ensureInitialDeck(buildDeps({ repository }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.createdNow).toBe(true);
    expect(result.value.deck).toBe(persistedDeck);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("returns createdNow false when active_decks already exists for the player", async () => {
    const existingDeck: Collection = new Map([["045", 2]]);
    const persist = vi.fn();
    const repository: InitialDeckRepository = {
      readExisting: async () => ok(existingDeck),
      persist: persist as unknown as InitialDeckRepository["persist"],
    };

    const result = await ensureInitialDeck(buildDeps({ repository }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.createdNow).toBe(false);
    expect(result.value.deck).toBe(existingDeck);
  });

  it("does not call the draw pipeline when the deck already exists", async () => {
    const loadCatalog = vi.fn(async (): Promise<Result<CatalogAndPool, DomainError>> =>
      ok(fakeCatalogAndPool(FOURTEEN_NUMBERS)),
    );
    const repository: InitialDeckRepository = {
      readExisting: async () => ok(new Map([["001", 1]])),
      persist: vi.fn() as unknown as InitialDeckRepository["persist"],
    };

    await ensureInitialDeck(buildDeps({ repository, loadCatalog }));

    expect(loadCatalog).not.toHaveBeenCalled();
  });
});
