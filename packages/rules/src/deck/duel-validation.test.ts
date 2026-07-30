import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Card } from "@yugioh/shared";
import { validateDeckComposition, validateDeckForDuel } from "./duel-validation.ts";

const valid = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => [String(index + 1).padStart(3, "0"), 2]),
);

describe("duel deck validation", () => {
  it("accepts exactly forty known cards", () => {
    expect(validateDeckForDuel({ composition: valid, catalog: () => ({}) as Card }).valid).toBe(
      true,
    );
  });

  it.each([
    [{ "001": 39 }, "insufficient_size"],
    [{ "001": 41 }, "excessive_size"],
    [{ ...valid, "001": 4, "002": 0 }, "copies_exceeded"],
  ])("reports structured violations", (composition, type) => {
    const result = validateDeckComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.violations.some((entry) => entry.type === type)).toBe(true);
  });

  it("reports unknown cards with structural violations", () => {
    const result = validateDeckForDuel({ composition: { "999": 39 }, catalog: () => undefined });
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.violations.map(({ type }) => type)).toEqual([
        "insufficient_size",
        "copies_exceeded",
        "unknown_card",
      ]);
  });

  it("matches the structural validity biconditional", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.stringMatching(/^[0-9]{3}$/), fc.integer({ min: -2, max: 5 })),
        (composition) => {
          const verdict = validateDeckComposition(composition);
          const quantities = Object.values(composition);
          const expected =
            quantities.reduce((sum, quantity) => sum + quantity, 0) === 40 &&
            quantities.every(
              (quantity) => Number.isInteger(quantity) && quantity >= 1 && quantity <= 3,
            );
          expect(verdict.valid).toBe(expected);
        },
      ),
      { numRuns: 1_000 },
    );
  });
});

export { valid };
