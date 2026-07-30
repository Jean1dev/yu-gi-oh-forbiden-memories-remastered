import type { Card, CardNumber, LibraryEntry } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { filterLibrarySearch, normalizeLibrarySearchTerm, prepareLibrarySearch } from "./search.ts";

function obtained(cardNumber: CardNumber, name: string): LibraryEntry {
  const card: Card = {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: name,
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
  return { obtained: true, cardNumber, card, art: { kind: "placeholder" } };
}

function blocked(cardNumber: CardNumber): LibraryEntry {
  return { obtained: false, cardNumber, art: { kind: "silhouette" } };
}

describe("normalizeLibrarySearchTerm", () => {
  it("trims external spaces and preserves the apparent text", () => {
    expect(normalizeLibrarySearchTerm("  Blue Eyes  ").originalText).toBe("Blue Eyes");
  });

  it("removes accents and lowercases the comparison form", () => {
    expect(normalizeLibrarySearchTerm("MÁGICO").nameText).toBe("magico");
  });

  it("collapses internal whitespace in the comparison form", () => {
    expect(normalizeLibrarySearchTerm("Blue \t  Eyes").nameText).toBe("blue eyes");
  });

  it("marks a whitespace-only term as empty", () => {
    expect(normalizeLibrarySearchTerm("   ").empty).toBe(true);
  });

  it("truncates terms above eighty characters", () => {
    expect(normalizeLibrarySearchTerm("x".repeat(81)).originalText).toHaveLength(80);
  });

  it.each([
    ["1", "001"],
    ["01", "001"],
    ["120", "120"],
  ])("converts %s to canonical card number %s", (input, expected) => {
    expect(normalizeLibrarySearchTerm(input).cardNumber).toBe(expected);
  });

  it.each(["0", "000", "1234"])("does not canonicalize invalid numeric term %s", (input) => {
    expect(normalizeLibrarySearchTerm(input).cardNumber).toBeUndefined();
  });
});

describe("prepareLibrarySearch", () => {
  it("preserves order and original entry references", () => {
    const entries = [obtained("002", "B"), obtained("001", "A")];
    const index = prepareLibrarySearch(entries);

    expect(index.map(({ cardNumber }) => cardNumber)).toEqual(["002", "001"]);
    expect(index[0]?.entry).toBe(entries[0]);
    expect(index[1]?.entry).toBe(entries[1]);
  });

  it("normalizes names only for obtained cards", () => {
    const index = prepareLibrarySearch([obtained("001", "Dragão Branco"), blocked("002")]);

    expect(index[0]?.normalizedName).toBe("dragao branco");
    expect(index[1]).not.toHaveProperty("normalizedName");
  });
});

describe("filterLibrarySearch", () => {
  const entries = [obtained("003", "Mago Negro"), blocked("001"), obtained("002", "Dragão Branco")];
  const index = prepareLibrarySearch(entries);

  it("returns every entry with the same references for an empty term", () => {
    const result = filterLibrarySearch(index, normalizeLibrarySearchTerm(""));
    expect(result).toEqual(entries);
    expect(result[0]).toBe(entries[0]);
  });

  it.each(["drag", "DRAGÃO", "dragao"])("finds an obtained card by name term %s", (term) => {
    expect(filterLibrarySearch(index, normalizeLibrarySearchTerm(term))).toEqual([entries[2]]);
  });

  it("finds a card by canonical number", () => {
    expect(filterLibrarySearch(index, normalizeLibrarySearchTerm("3"))).toEqual([entries[0]]);
  });

  it("does not find a blocked card by name", () => {
    expect(filterLibrarySearch(index, normalizeLibrarySearchTerm("dragon"))).toEqual([]);
  });

  it("finds a blocked card by number", () => {
    expect(filterLibrarySearch(index, normalizeLibrarySearchTerm("1"))).toEqual([entries[1]]);
  });

  it("preserves the relative order of matching entries", () => {
    expect(filterLibrarySearch(index, normalizeLibrarySearchTerm("o"))).toEqual([
      entries[0],
      entries[2],
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterLibrarySearch(index, normalizeLibrarySearchTerm("not found"))).toEqual([]);
  });
});
