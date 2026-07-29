import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Card, CardCatalogLookup } from "@yugioh/shared";

import { validateDuelist } from "./validate-duelist.ts";

const knownNumbers = Array.from({ length: 20 }, (_, index) => String(index + 1).padStart(3, "0"));
const validDeck = Array.from({ length: 40 }, (_, index) => knownNumbers[index % 20]);
const catalog: CardCatalogLookup = (cardNumber) =>
  knownNumbers.includes(cardNumber) ? ({} as Card) : undefined;

function duelist(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: "duelist-one",
    name: "Duelist One",
    portrait: "duelists/one.webp",
    difficulty: "easy",
    profile: { strategy: "balanced", parameters: {} },
    deck: validDeck,
    dropPool: [],
    ...overrides,
  };
}

describe("validateDuelist", () => {
  it("accepts a deck with exactly forty cards", () => {
    expect(validateDuelist(duelist(), catalog).ok).toBe(true);
  });

  it.each([
    [validDeck.slice(1), "invalid_deck_size"],
    [[...validDeck, "001"], "invalid_deck_size"],
    [[..."001001001001".match(/.{3}/g)!, ...validDeck.slice(4)], "too_many_card_copies"],
  ])("rejects an invalid deck", (deck, code) => {
    const result = validateDuelist(duelist({ deck }), catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });

  it("rejects an unknown deck card", () => {
    const result = validateDuelist(duelist({ deck: ["999", ...validDeck.slice(1)] }), catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unknown_card");
  });

  it("rejects an unknown drop card", () => {
    const result = validateDuelist(
      duelist({ dropPool: [{ tier: "rare", cardNumbers: ["999"] }] }),
      catalog,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unknown_card");
  });

  it("accepts an omitted or empty drop pool", () => {
    const withoutPool = duelist() as Record<string, unknown>;
    delete withoutPool.dropPool;
    expect(validateDuelist(withoutPool, catalog).ok).toBe(true);
    expect(validateDuelist(duelist({ dropPool: [] }), catalog).ok).toBe(true);
  });

  it.each([
    [
      [
        { tier: "rare", cardNumbers: ["001"] },
        { tier: "rare", cardNumbers: ["002"] },
      ],
      "duplicate_drop_tier",
    ],
    [[{ tier: "rare", cardNumbers: [] }], "empty_drop_tier"],
  ])("reports a precise invalid drop pool code", (dropPool, code) => {
    const result = validateDuelist(duelist({ dropPool }), catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });

  it.each([
    [{ id: "_" }, "invalid_duelist_id"],
    [{ name: "" }, "invalid_duelist_name"],
    [{ difficulty: "legendary" }, "invalid_difficulty_level"],
    [{ profile: { strategy: "", parameters: {} } }, "invalid_difficulty_profile"],
    [{ extra: true }, "invalid_roster"],
  ])("rejects invalid fields", (override, code) => {
    const result = validateDuelist(duelist(override), catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });

  it("rejects every generated deck whose size is not forty", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.constantFrom(...knownNumbers), { minLength: 0, maxLength: 120 })
          .filter((deck) => deck.length !== 40),
        (deck) => {
          const result = validateDuelist(duelist({ deck }), catalog);
          expect(result.ok).toBe(false);
          if (!result.ok) expect(result.error.code).toBe("invalid_deck_size");
        },
      ),
      { numRuns: 1_000 },
    );
  });
});

export { catalog, duelist, validDeck };
