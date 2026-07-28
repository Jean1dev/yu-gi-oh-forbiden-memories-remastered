import type { Collection, DeckDraft } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { validateDeckDraft } from "./validation.ts";

/** Distinct card numbers, at most 3 copies each, summing to `total`. Stays within the copy cap. */
function deckOfSize(total: number): DeckDraft {
  const entries: [string, number][] = [];
  let remaining = total;
  let nextCardNumber = 1;
  while (remaining > 0) {
    const quantity = Math.min(3, remaining);
    entries.push([String(nextCardNumber).padStart(3, "0"), quantity]);
    remaining -= quantity;
    nextCardNumber += 1;
  }
  return new Map(entries);
}

describe("validateDeckDraft", () => {
  it("returns valid true and no violations for exactly forty cards with no excesses", () => {
    const draft = deckOfSize(40);
    const owned: Collection = draft;

    const result = validateDeckDraft(draft, owned);

    expect(result.valid).toBe(true);
    expect(result.total).toBe(40);
    expect(result.violations).toEqual([]);
  });

  it("returns insufficient_total with the correct missing count when total is below forty", () => {
    const draft = deckOfSize(38);
    const owned: Collection = draft;

    const result = validateDeckDraft(draft, owned);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual([{ type: "insufficient_total", missing: 2 }]);
  });

  it("returns excessive_total with the correct excess count when total is above forty", () => {
    const draft = deckOfSize(42);
    const owned: Collection = draft;

    const result = validateDeckDraft(draft, owned);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual({ type: "excessive_total", excess: 2 });
  });

  it("returns copy_limit_exceeded for a card with more than three copies in the draft", () => {
    const draft: DeckDraft = new Map([["045", 4]]);
    const owned: Collection = new Map([["045", 10]]);

    const result = validateDeckDraft(draft, owned);

    expect(result.violations).toContainEqual({
      type: "copy_limit_exceeded",
      cardNumber: "045",
      quantityInDraft: 4,
    });
  });

  it("returns exceeds_owned_quantity for a card with a draft quantity greater than owned", () => {
    const draft: DeckDraft = new Map([["333", 3]]);
    const owned: Collection = new Map([["333", 2]]);

    const result = validateDeckDraft(draft, owned);

    expect(result.violations).toContainEqual({
      type: "exceeds_owned_quantity",
      cardNumber: "333",
      quantityInDraft: 3,
      quantityOwned: 2,
    });
  });

  it("returns exceeds_owned_quantity when the owned quantity is zero", () => {
    const draft: DeckDraft = new Map([["500", 1]]);
    const owned: Collection = new Map();

    const result = validateDeckDraft(draft, owned);

    expect(result.violations).toContainEqual({
      type: "exceeds_owned_quantity",
      cardNumber: "500",
      quantityInDraft: 1,
      quantityOwned: 0,
    });
  });

  it("returns both per-card violations simultaneously when a card exceeds both the cap and ownership", () => {
    const draft: DeckDraft = new Map([["045", 5]]);
    const owned: Collection = new Map([["045", 2]]);

    const result = validateDeckDraft(draft, owned);

    const forCard045 = result.violations.filter((v) => "cardNumber" in v && v.cardNumber === "045");
    expect(forCard045).toEqual([
      { type: "copy_limit_exceeded", cardNumber: "045", quantityInDraft: 5 },
      { type: "exceeds_owned_quantity", cardNumber: "045", quantityInDraft: 5, quantityOwned: 2 },
    ]);
  });

  it("orders violations with the total violation first, then by ascending card number", () => {
    const draft: DeckDraft = new Map([
      ["333", 4],
      ["045", 4],
    ]);
    const owned: Collection = new Map([
      ["333", 4],
      ["045", 4],
    ]);

    const result = validateDeckDraft(draft, owned);

    expect(result.violations.map((v) => ("cardNumber" in v ? v.cardNumber : v.type))).toEqual([
      "insufficient_total",
      "045",
      "333",
    ]);
  });

  it("orders copy_limit_exceeded before exceeds_owned_quantity for the same card", () => {
    const draft: DeckDraft = new Map([["045", 5]]);
    const owned: Collection = new Map([["045", 2]]);

    const result = validateDeckDraft(draft, owned);

    const forCard045 = result.violations.filter((v) => "cardNumber" in v && v.cardNumber === "045");
    expect(forCard045.map((v) => v.type)).toEqual(["copy_limit_exceeded", "exceeds_owned_quantity"]);
  });

  it("returns a coherent neutral result for an empty draft", () => {
    const result = validateDeckDraft(new Map(), new Map());

    expect(result).toEqual({
      valid: false,
      total: 0,
      violations: [{ type: "insufficient_total", missing: 40 }],
    });
  });
});
