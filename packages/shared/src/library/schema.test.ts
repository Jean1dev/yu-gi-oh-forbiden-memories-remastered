import { describe, expect, it } from "vitest";

import type { Card } from "../card/types.ts";
import {
  ArtReferenceSchema,
  LibraryEntrySchema,
  LibraryFiltersSchema,
  LibraryIndexSchema,
  LibraryQueryResultSchema,
} from "./schema.ts";

function validCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 999_999,
    tipo: "monstro",
    ...overrides,
  };
}

describe("ArtReferenceSchema", () => {
  it("accepts the art variant with a path", () => {
    expect(ArtReferenceSchema.safeParse({ kind: "art", path: "cards-data/001.jpg" }).success).toBe(
      true,
    );
  });

  it("accepts the placeholder variant with no path", () => {
    expect(ArtReferenceSchema.safeParse({ kind: "placeholder" }).success).toBe(true);
  });

  it("accepts the silhouette variant with no path", () => {
    expect(ArtReferenceSchema.safeParse({ kind: "silhouette" }).success).toBe(true);
  });

  it("rejects a placeholder variant carrying a path", () => {
    expect(
      ArtReferenceSchema.safeParse({ kind: "placeholder", path: "cards-data/001.jpg" }).success,
    ).toBe(false);
  });

  it("rejects a silhouette variant carrying a path", () => {
    expect(
      ArtReferenceSchema.safeParse({ kind: "silhouette", path: "cards-data/001.jpg" }).success,
    ).toBe(false);
  });
});

describe("LibraryEntrySchema", () => {
  it("accepts an obtained entry with card and art", () => {
    const result = LibraryEntrySchema.safeParse({
      obtained: true,
      cardNumber: "001",
      card: validCard(),
      art: { kind: "art", path: "cards-data/001.jpg" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a not-obtained entry with only cardNumber and silhouette", () => {
    const result = LibraryEntrySchema.safeParse({
      obtained: false,
      cardNumber: "380",
      art: { kind: "silhouette" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a not-obtained entry carrying a card field (Decision 2, runtime-checkable)", () => {
    const result = LibraryEntrySchema.safeParse({
      obtained: false,
      cardNumber: "380",
      card: validCard({ numero: "380" }),
      art: { kind: "silhouette" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a not-obtained entry with an art variant other than silhouette", () => {
    const result = LibraryEntrySchema.safeParse({
      obtained: false,
      cardNumber: "380",
      art: { kind: "placeholder" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an obtained entry missing the card field", () => {
    const result = LibraryEntrySchema.safeParse({
      obtained: true,
      cardNumber: "001",
      art: { kind: "art", path: "cards-data/001.jpg" },
    });
    expect(result.success).toBe(false);
  });
});

describe("LibraryIndexSchema", () => {
  function index(overrides: {
    entries?: unknown[];
    total?: number;
    obtained?: number;
    obtainedOutsideCatalog?: string[];
  }) {
    return {
      entries: overrides.entries ?? [],
      total: overrides.total ?? 0,
      obtained: overrides.obtained ?? 0,
      obtainedOutsideCatalog: overrides.obtainedOutsideCatalog ?? [],
    };
  }

  it("accepts an index where obtained is less than or equal to total", () => {
    expect(LibraryIndexSchema.safeParse(index({ total: 722, obtained: 47 })).success).toBe(true);
  });

  it("rejects an index where obtained exceeds total", () => {
    expect(LibraryIndexSchema.safeParse(index({ total: 722, obtained: 723 })).success).toBe(false);
  });
});

describe("LibraryFiltersSchema", () => {
  it("accepts a valid nondefault filter state", () => {
    expect(
      LibraryFiltersSchema.safeParse({
        types: ["monstro", "equipamento"],
        status: "todas",
        sort: { field: "atk", direction: "desc" },
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate and unsupported filter types", () => {
    expect(
      LibraryFiltersSchema.safeParse({
        types: ["monstro", "monstro"],
        status: "obtidas",
        sort: { field: "numero", direction: "asc" },
      }).success,
    ).toBe(false);
    expect(
      LibraryFiltersSchema.safeParse({
        types: ["ritual"],
        status: "obtidas",
        sort: { field: "numero", direction: "asc" },
      }).success,
    ).toBe(false);
  });

  it("validates the serializable query result", () => {
    expect(
      LibraryQueryResultSchema.safeParse({
        entries: [],
        totalBefore: 3,
        totalAfter: 0,
        activeFilters: {
          types: [],
          status: "obtidas",
          sort: { field: "numero", direction: "asc" },
        },
        hasNonDefaultFilters: false,
      }).success,
    ).toBe(true);
  });
});
