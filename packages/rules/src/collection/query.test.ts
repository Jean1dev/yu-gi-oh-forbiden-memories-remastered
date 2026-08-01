import {
  DEFAULT_BUILD_DECK_COLLECTION_FILTERS,
  DEFAULT_BUILD_DECK_COLLECTION_SORT,
  type BuildDeckCollectionQuery,
  type Card,
  type CollectionItem,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { filterCollectionItems, queryCollectionItems, sortCollectionItems } from "./query.ts";

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

function item(overrides: Partial<Card> = {}, quantity = 1): CollectionItem {
  return { card: card(overrides), quantity, copyLimit: Math.min(quantity, 3) };
}

const dragon = item(
  {
    numero: "001",
    nome: "Blue-eyes White Dragon",
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    estrelas: 999_999,
    tipo: "monstro",
  },
  2,
);
const warrior = item(
  {
    numero: "002",
    nome: "Celtic Guardian",
    classe: "Warrior",
    atk: 1400,
    def: 1200,
    guardiao1: "Moon",
    guardiao2: "Venus",
    estrelas: 300,
    tipo: "monstro",
  },
  3,
);
const spell = item(
  {
    numero: "003",
    nome: "Dark Hole",
    classe: "Magic",
    atk: null,
    def: null,
    guardiao1: null,
    guardiao2: null,
    estrelas: null,
    tipo: "magica",
  },
  1,
);
const lowQuantity = item(
  {
    numero: "004",
    nome: "Aqua Madoor",
    classe: "Spellcaster",
    atk: 1200,
    def: 2000,
    guardiao1: "Mercury",
    guardiao2: "Moon",
    estrelas: 250,
    tipo: "monstro",
  },
  1,
);

const items = [dragon, warrior, spell, lowQuantity] as const;

function query(overrides: Partial<BuildDeckCollectionQuery>): BuildDeckCollectionQuery {
  return {
    term: "",
    filters: DEFAULT_BUILD_DECK_COLLECTION_FILTERS,
    sort: DEFAULT_BUILD_DECK_COLLECTION_SORT,
    ...overrides,
  };
}

describe("filterCollectionItems", () => {
  it("combines type, class and guardian filters with AND semantics", () => {
    expect(
      filterCollectionItems(items, {
        cardType: "monstro",
        cardClass: "Warrior",
        guardian: "Moon",
      }),
    ).toEqual([warrior]);
  });

  it("matches the guardian filter against guardiao1 and guardiao2", () => {
    expect(
      filterCollectionItems(items, {
        ...DEFAULT_BUILD_DECK_COLLECTION_FILTERS,
        guardian: "Moon",
      }),
    ).toEqual([warrior, lowQuantity]);
  });
});

describe("sortCollectionItems", () => {
  it.each([
    ["numero", "asc", ["001", "002", "003", "004"]],
    ["numero", "desc", ["004", "003", "002", "001"]],
    ["nome", "asc", ["004", "001", "002", "003"]],
    ["nome", "desc", ["003", "002", "001", "004"]],
    ["atk", "asc", ["004", "002", "001", "003"]],
    ["atk", "desc", ["001", "002", "004", "003"]],
    ["def", "asc", ["002", "004", "001", "003"]],
    ["def", "desc", ["001", "004", "002", "003"]],
    ["estrelas", "asc", ["004", "002", "001", "003"]],
    ["estrelas", "desc", ["001", "002", "004", "003"]],
    ["quantity", "asc", ["003", "004", "001", "002"]],
    ["quantity", "desc", ["002", "001", "003", "004"]],
  ] as const)("sorts by %s in %s direction", (field, direction, expected) => {
    expect(
      sortCollectionItems(items, { field, direction }).map((entry) => entry.card.numero),
    ).toEqual(expected);
  });

  it("does not mutate the received item list", () => {
    const original = [...items];
    sortCollectionItems(items, { field: "atk", direction: "desc" });
    expect(items).toEqual(original);
  });
});

describe("queryCollectionItems", () => {
  it("combines name search, filters and sorting", () => {
    const result = queryCollectionItems(
      items,
      query({
        term: "guardian",
        filters: {
          cardType: "monstro",
          cardClass: undefined,
          guardian: "Moon",
        },
        sort: { field: "quantity", direction: "desc" },
      }),
    );

    expect(result).toEqual([warrior]);
  });
});
