import { describe, expect, it } from "vitest";
import type { Card } from "@yugioh/shared";
import { buildReadyDeck } from "./ready-deck.ts";
import { valid } from "./duel-validation.test.ts";

describe("buildReadyDeck", () => {
  it("returns forty deterministic card numbers", () => {
    const result = buildReadyDeck({ composition: valid, catalog: () => ({}) as Card });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.cardNumbers).toHaveLength(40);
  });

  it("returns active_deck_invalid for invalid input", () => {
    const result = buildReadyDeck({ composition: {}, catalog: () => undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("active_deck_invalid");
  });
});
