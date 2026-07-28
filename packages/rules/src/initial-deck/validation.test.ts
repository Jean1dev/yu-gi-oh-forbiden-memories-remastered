import type { Collection } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { verifyGeneratedDeckInvariants } from "./validation.ts";

function deckWith(entries: readonly (readonly [string, number])[]): Collection {
  return new Map(entries);
}

describe("verifyGeneratedDeckInvariants", () => {
  it("accepts a deck with forty cards and at most three copies", () => {
    const deck = deckWith([
      ["001", 3],
      ["002", 3],
      ["003", 3],
      ["004", 3],
      ["005", 3],
      ["006", 3],
      ["007", 3],
      ["008", 3],
      ["009", 3],
      ["010", 3],
      ["011", 3],
      ["012", 3],
      ["013", 3],
      ["014", 1],
    ]);

    const result = verifyGeneratedDeckInvariants(deck);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(deck);
  });

  it("rejects a deck whose total differs from forty", () => {
    const deck = deckWith([["001", 3]]);

    const result = verifyGeneratedDeckInvariants(deck);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("initial_deck_invalid");
  });

  it("rejects a deck with four or more copies of one card", () => {
    const deck = deckWith([
      ["001", 4],
      ["002", 3],
      ["003", 3],
      ["004", 3],
      ["005", 3],
      ["006", 3],
      ["007", 3],
      ["008", 3],
      ["009", 3],
      ["010", 3],
      ["011", 3],
      ["012", 3],
      ["013", 3],
    ]);

    const result = verifyGeneratedDeckInvariants(deck);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("initial_deck_invalid");
  });
});
