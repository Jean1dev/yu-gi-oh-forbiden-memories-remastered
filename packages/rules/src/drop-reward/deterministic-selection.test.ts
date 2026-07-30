import { describe, expect, it } from "vitest";

import { deriveDeterministicIndex, deriveWeightedSelection } from "./deterministic-selection.ts";

describe("deriveDeterministicIndex", () => {
  it("returns the same index for the same key and bound", () => {
    const first = deriveDeterministicIndex("session-1", 10);
    const second = deriveDeterministicIndex("session-1", 10);

    expect(first).toBe(second);
  });

  it("always returns an index within [0, bound)", () => {
    for (const key of ["a", "session-1", "session-2", "a-very-long-duel-session-id"]) {
      const index = deriveDeterministicIndex(key, 7);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(7);
    }
  });

  it("returns 0 when bound is 1", () => {
    expect(deriveDeterministicIndex("session-1", 1)).toBe(0);
    expect(deriveDeterministicIndex("anything-else", 1)).toBe(0);
  });
});

describe("deriveWeightedSelection", () => {
  it("returns an index within the weights array bounds", () => {
    const weights = [1, 1, 1, 1];
    for (const key of ["a", "b", "c", "d", "e"]) {
      const index = deriveWeightedSelection(key, weights);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(weights.length);
    }
  });

  it("treats a non-positive weight as 1", () => {
    const withNegative = deriveWeightedSelection("session-1", [1, -5, 1]);
    const withOneInPlace = deriveWeightedSelection("session-1", [1, 1, 1]);

    expect(withNegative).toBe(withOneInPlace);
  });

  it("treats a non-finite weight as 1", () => {
    const withNaN = deriveWeightedSelection("session-1", [1, Number.NaN, 1]);
    const withOneInPlace = deriveWeightedSelection("session-1", [1, 1, 1]);

    expect(withNaN).toBe(withOneInPlace);
  });

  it("is deterministic for the same key and weights", () => {
    const weights = [1, 2, 3];
    const first = deriveWeightedSelection("session-1", weights);
    const second = deriveWeightedSelection("session-1", weights);

    expect(first).toBe(second);
  });
});
