import type { Card, CollectionItem } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { searchByName } from "./search.ts";

function card(overrides: Partial<Card> = {}): Card {
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

function item(overrides: Partial<Card> = {}): CollectionItem {
  return { card: card(overrides), quantity: 1, copyLimit: 1 };
}

describe("searchByName", () => {
  it("returns all items when the term is empty", () => {
    const items = [item({ numero: "001", nome: "Dragon" }), item({ numero: "002", nome: "Elf" })];
    expect(searchByName(items, "")).toEqual(items);
  });

  it("returns all items when the term is only whitespace", () => {
    const items = [item({ numero: "001", nome: "Dragon" })];
    expect(searchByName(items, "   ")).toEqual(items);
  });

  it("filters by case-insensitive substring in the name", () => {
    const dragon = item({ numero: "001", nome: "Blue-eyes White Dragon" });
    const elf = item({ numero: "002", nome: "Mystical Elf" });
    expect(searchByName([dragon, elf], "WHITE")).toEqual([dragon]);
    expect(searchByName([dragon, elf], "elf")).toEqual([elf]);
  });

  it("returns an empty list when no name contains the term", () => {
    const items = [item({ nome: "Dragon" })];
    expect(searchByName(items, "phoenix")).toEqual([]);
  });

  it("preserves the relative order of the received items", () => {
    const items = [
      item({ numero: "003", nome: "Baby Dragon" }),
      item({ numero: "001", nome: "Red Dragon" }),
      item({ numero: "002", nome: "Elf" }),
    ];
    expect(searchByName(items, "dragon").map((entry) => entry.card.numero)).toEqual([
      "003",
      "001",
    ]);
  });

  it("does not mutate the received item list", () => {
    const items = [item({ numero: "001", nome: "Dragon" }), item({ numero: "002", nome: "Elf" })];
    const copy = [...items];
    searchByName(items, "dragon");
    expect(items).toEqual(copy);
  });
});
