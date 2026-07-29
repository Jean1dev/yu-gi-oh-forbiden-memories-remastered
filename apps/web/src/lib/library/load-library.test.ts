import {
  DomainError,
  err,
  ok,
  type Card,
  type CardArtLookup,
  type Collection,
  type LibraryCatalogListing,
  type LoadedCollection,
  type Result,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import type { LibraryCatalog } from "./catalog-library.ts";
import { loadLibrary } from "./load-library.ts";

function card(numero: string): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Card ${numero}`,
    img: null,
    classe: "Dragon",
    atk: 100,
    def: 100,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

const placeholderArtLookup: CardArtLookup = () => ({ kind: "placeholder" });

function fakeCatalog(numbers: readonly string[]): LibraryCatalog {
  const cards = numbers.map(card);
  const listing: LibraryCatalogListing = {
    listAll: () => cards,
    totalCount: () => cards.length,
  };
  return { listing, artLookup: placeholderArtLookup };
}

function fakeLoadedCollection(
  origin: "server" | "cache",
  entries: readonly [string, number][],
  syncedAt = "2026-07-28T12:00:00.000Z",
): LoadedCollection {
  const collection: Collection = new Map(entries);
  return { origin, collection, syncedAt } as LoadedCollection;
}

describe("loadLibrary", () => {
  it("returns the complete index when catalog and collection both load", async () => {
    const result = await loadLibrary({
      getCatalog: async () => ok(fakeCatalog(["001", "002"])),
      loadCollection: async () => ok(fakeLoadedCollection("server", [["001", 1]])),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.index.total).toBe(2);
    expect(result.value.index.obtained).toBe(1);
  });

  it("fails with catalog_unavailable when the catalog does not load", async () => {
    const result = await loadLibrary({
      getCatalog: async () => err(new DomainError("no catalog", "catalog_unavailable")),
      loadCollection: async () => ok(fakeLoadedCollection("server", [])),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("catalog_unavailable");
  });

  it("does not consult the collection when the catalog fails", async () => {
    const loadCollection = vi.fn(async () => ok(fakeLoadedCollection("server", [])));

    await loadLibrary({
      getCatalog: async () => err(new DomainError("no catalog", "catalog_unavailable")),
      loadCollection,
    });

    expect(loadCollection).not.toHaveBeenCalled();
  });

  it("fails with collection_unavailable when the collection does not load", async () => {
    const result = await loadLibrary({
      getCatalog: async () => ok(fakeCatalog(["001"])),
      loadCollection: async () => err(new DomainError("no collection", "collection_unavailable")),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("collection_unavailable");
  });

  it("does not return an index with every card marked not obtained when the collection fails", async () => {
    const result = await loadLibrary({
      getCatalog: async () => ok(fakeCatalog(["001", "002"])),
      loadCollection: async () => err(new DomainError("no collection", "collection_unavailable")),
    });

    expect(result.ok).toBe(false);
  });

  it("propagates collectionOrigin server when the remote read succeeds", async () => {
    const result = await loadLibrary({
      getCatalog: async () => ok(fakeCatalog(["001"])),
      loadCollection: async () => ok(fakeLoadedCollection("server", [])),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collectionOrigin).toBe("server");
  });

  it("propagates collectionOrigin cache when the remote read falls back to cache", async () => {
    const result = await loadLibrary({
      getCatalog: async () => ok(fakeCatalog(["001"])),
      loadCollection: async () => ok(fakeLoadedCollection("cache", [])),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collectionOrigin).toBe("cache");
  });

  it("preserves the syncedAt reported by the collection load", async () => {
    const result = await loadLibrary({
      getCatalog: async () => ok(fakeCatalog(["001"])),
      loadCollection: async () =>
        ok(fakeLoadedCollection("server", [], "2026-01-01T00:00:00.000Z")),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.syncedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("reuses the memoized catalog on the second call", async () => {
    let calls = 0;
    let cached: Promise<Result<LibraryCatalog, DomainError>> | undefined;
    const getCatalog = (): Promise<Result<LibraryCatalog, DomainError>> => {
      if (cached === undefined) {
        calls += 1;
        cached = Promise.resolve(ok(fakeCatalog(["001"])));
      }
      return cached;
    };

    await loadLibrary({
      getCatalog,
      loadCollection: async () => ok(fakeLoadedCollection("server", [])),
    });
    await loadLibrary({
      getCatalog,
      loadCollection: async () => ok(fakeLoadedCollection("server", [])),
    });

    expect(calls).toBe(1);
  });

  it("rereads the collection on every call even with the catalog memoized", async () => {
    const loadCollection = vi.fn(async () => ok(fakeLoadedCollection("server", [])));
    const getCatalog = async (): Promise<Result<LibraryCatalog, DomainError>> =>
      ok(fakeCatalog(["001"]));

    await loadLibrary({ getCatalog, loadCollection });
    await loadLibrary({ getCatalog, loadCollection });

    expect(loadCollection).toHaveBeenCalledTimes(2);
  });
});
