import { DEFAULT_LIBRARY_FILTERS, type LibraryEntry } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { queryLibraryEntries } from "./query.ts";

const monster = {
  obtained: true,
  cardNumber: "002",
  card: {
    id: 2,
    numero: "002",
    nome: "Monster",
    img: null,
    classe: "Dragon",
    atk: 200,
    def: 100,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: 2,
    tipo: "monstro",
  },
  art: { kind: "placeholder" },
} as const satisfies LibraryEntry;
const spell = {
  obtained: true,
  cardNumber: "001",
  card: { ...monster.card, id: 1, numero: "001", nome: "Spell", tipo: "magica", atk: null },
  art: { kind: "placeholder" },
} as const satisfies LibraryEntry;
const blocked = {
  obtained: false,
  cardNumber: "003",
  art: { kind: "silhouette" },
} as const satisfies LibraryEntry;

describe("queryLibraryEntries", () => {
  it("combines status, type, search and sorting with AND semantics", () => {
    const result = queryLibraryEntries({
      entries: [blocked, monster, spell],
      filters: {
        types: ["monstro"],
        status: "todas",
        sort: { field: "atk", direction: "desc" },
      },
      search: (entry) => entry.cardNumber === "002",
    });
    expect(result.entries).toEqual([monster]);
    expect(result.totalBefore).toBe(3);
    expect(result.totalAfter).toBe(1);
  });

  it("uses accept-all search behavior when no predicate is provided", () => {
    expect(
      queryLibraryEntries({ entries: [monster], filters: DEFAULT_LIBRARY_FILTERS }).entries,
    ).toEqual([monster]);
  });

  it("reports default and nondefault filter states", () => {
    expect(
      queryLibraryEntries({ entries: [monster], filters: DEFAULT_LIBRARY_FILTERS })
        .hasNonDefaultFilters,
    ).toBe(false);
    expect(
      queryLibraryEntries({
        entries: [monster],
        filters: { ...DEFAULT_LIBRARY_FILTERS, types: ["monstro"] },
      }).hasNonDefaultFilters,
    ).toBe(true);
  });

  it("preserves structural redaction on blocked results", () => {
    const [result] = queryLibraryEntries({
      entries: [blocked],
      filters: { ...DEFAULT_LIBRARY_FILTERS, status: "todas" },
    }).entries;
    expect(result).not.toHaveProperty("card");
    expect(result?.art).toEqual({ kind: "silhouette" });
  });
});
