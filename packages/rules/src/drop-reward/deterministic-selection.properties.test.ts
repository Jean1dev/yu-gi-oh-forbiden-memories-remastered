import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { deriveDeterministicIndex, deriveWeightedSelection } from "./deterministic-selection.ts";

describe("deriveDeterministicIndex determinism", () => {
  it("always returns the same index for the same key and bound", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 1000 }),
        (key, bound) => {
          const first = deriveDeterministicIndex(key, bound);
          const second = deriveDeterministicIndex(key, bound);
          expect(first).toBe(second);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("deriveDeterministicIndex range", () => {
  it("always returns an index within [0, bound)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 1000 }),
        (key, bound) => {
          const index = deriveDeterministicIndex(key, bound);
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(bound);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("deriveWeightedSelection weight proportion", () => {
  it("selects the double-weighted index roughly twice as often as each single-weighted index", () => {
    const weights = [1, 2, 1];
    const counts = [0, 0, 0];
    const samples = 20_000;

    for (let i = 0; i < samples; i++) {
      const index = deriveWeightedSelection(`sample-key-${i}`, weights);
      counts[index] = (counts[index] ?? 0) + 1;
    }

    const ratioToIndex0 = (counts[1] ?? 0) / (counts[0] ?? 1);
    const ratioToIndex2 = (counts[1] ?? 0) / (counts[2] ?? 1);

    // Wide statistical tolerance: this only checks direction of influence, not
    // distribution quality (spec free-duel/F06 §7).
    expect(ratioToIndex0).toBeGreaterThan(1.4);
    expect(ratioToIndex0).toBeLessThan(2.6);
    expect(ratioToIndex2).toBeGreaterThan(1.4);
    expect(ratioToIndex2).toBeLessThan(2.6);
  });
});
