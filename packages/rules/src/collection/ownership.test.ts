import type { Collection } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { copyLimit, ownedEntries, ownedQuantity, owns } from "./ownership.ts";

describe("copyLimit", () => {
  const cases = [
    { name: "quantity is zero", quantity: 0, expected: 0 },
    { name: "quantity is one", quantity: 1, expected: 1 },
    { name: "quantity is exactly three", quantity: 3, expected: 3 },
    { name: "quantity saturates at three when it is five", quantity: 5, expected: 3 },
  ] as const;

  for (const item of cases) {
    it(`returns ${String(item.expected)} when ${item.name}`, () => {
      expect(copyLimit(item.quantity)).toBe(item.expected);
    });
  }
});

describe("ownedEntries", () => {
  it("omits a card with quantity zero", () => {
    const collection: Collection = new Map([
      ["001", 3],
      ["002", 0],
    ]);
    expect(ownedEntries(collection)).toEqual([{ cardNumber: "001", quantity: 3 }]);
  });

  it("keeps a card with quantity one", () => {
    const collection: Collection = new Map([["045", 1]]);
    expect(ownedEntries(collection)).toEqual([{ cardNumber: "045", quantity: 1 }]);
  });

  it("orders entries by ascending card number", () => {
    const collection: Collection = new Map([
      ["333", 2],
      ["001", 1],
      ["045", 4],
    ]);
    expect(ownedEntries(collection).map((entry) => entry.cardNumber)).toEqual([
      "001",
      "045",
      "333",
    ]);
  });

  it("returns an empty list for an empty collection", () => {
    expect(ownedEntries(new Map())).toEqual([]);
  });
});

describe("ownedQuantity", () => {
  it("returns zero for a card absent from the collection", () => {
    expect(ownedQuantity(new Map(), "001")).toBe(0);
  });
});

describe("owns", () => {
  it("returns false for an absent card and true for a card with one copy", () => {
    const collection: Collection = new Map([["001", 1]]);
    expect(owns(collection, "999")).toBe(false);
    expect(owns(collection, "001")).toBe(true);
  });
});
