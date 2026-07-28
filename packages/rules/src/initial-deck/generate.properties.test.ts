import type { CardNumber } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { drawInitialDeck, type RandomSource } from "./draw.ts";
import { verifyGeneratedDeckInvariants } from "./validation.ts";

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

describe("verifyGeneratedDeckInvariants never disagrees with drawInitialDeck", () => {
  it("never rejects the result of drawInitialDeck, for any pool and any draw sequence", () => {
    fc.assert(
      fc.property(poolArb, fc.integer(), (pool: readonly CardNumber[], seed) => {
        const drawResult = drawInitialDeck(pool, seededRandomSource(seed));
        expect(drawResult.ok).toBe(true);
        if (!drawResult.ok) return;

        const verifyResult = verifyGeneratedDeckInvariants(drawResult.value);
        expect(verifyResult.ok).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });
});
