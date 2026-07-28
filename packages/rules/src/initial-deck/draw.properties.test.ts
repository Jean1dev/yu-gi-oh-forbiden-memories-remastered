import type { CardNumber } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { drawInitialDeck, type RandomSource } from "./draw.ts";

/** Deterministic given a seed, not itself under test — only drives the shuffle. */
function seededRandomSource(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    nextInt(exclusiveUpperBound) {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state % exclusiveUpperBound;
    },
  };
}

const poolArb = fc
  .integer({ min: 14, max: 200 })
  .chain((size) =>
    fc.uniqueArray(
      fc.integer({ min: 0, max: 999 }).map((n) => String(n).padStart(3, "0")),
      { minLength: size, maxLength: size },
    ),
  );

describe("drawInitialDeck structural invariant", () => {
  it("always draws exactly forty cards with no more than three copies of any number, for any pool of 14-200 distinct numbers", () => {
    fc.assert(
      fc.property(poolArb, fc.integer(), (pool: readonly CardNumber[], seed) => {
        const result = drawInitialDeck(pool, seededRandomSource(seed));

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const total = [...result.value.values()].reduce((sum, quantity) => sum + quantity, 0);
        expect(total).toBe(40);
        for (const quantity of result.value.values()) {
          expect(quantity).toBeLessThanOrEqual(3);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe("drawInitialDeck origin conservation", () => {
  it("never draws a number outside the pool it received", () => {
    fc.assert(
      fc.property(poolArb, fc.integer(), (pool: readonly CardNumber[], seed) => {
        const result = drawInitialDeck(pool, seededRandomSource(seed));

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const poolSet = new Set(pool);
        for (const cardNumber of result.value.keys()) {
          expect(poolSet.has(cardNumber)).toBe(true);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe("drawInitialDeck minimum pool domain", () => {
  it("always fails with initial_pool_insufficient for any pool with fewer than fourteen distinct numbers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 13 }).chain((size) =>
          fc.uniqueArray(
            fc.integer({ min: 0, max: 999 }).map((n) => String(n).padStart(3, "0")),
            { minLength: size, maxLength: size },
          ),
        ),
        fc.integer(),
        (pool: readonly CardNumber[], seed) => {
          const result = drawInitialDeck(pool, seededRandomSource(seed));

          expect(result.ok).toBe(false);
          if (result.ok) return;
          expect(result.error.code).toBe("initial_pool_insufficient");
        },
      ),
      { numRuns: 1000 },
    );
  });
});
