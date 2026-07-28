import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { canonicalizePair } from "./canonicalize-pair.ts";

describe("canonicalizePair", () => {
  it("produces the same key regardless of the order of the two values", () => {
    expect(canonicalizePair("001", "002")).toBe(canonicalizePair("002", "001"));
    expect(canonicalizePair("Dragon", "Aqua")).toBe(canonicalizePair("Aqua", "Dragon"));
  });

  it("produces different keys for distinct pairs", () => {
    expect(canonicalizePair("001", "002")).not.toBe(canonicalizePair("001", "003"));
    expect(canonicalizePair("Dragon", "Aqua")).not.toBe(canonicalizePair("Dragon", "Beast"));
  });

  it("does not collide when a value contains a space, unlike a naive join", () => {
    expect(canonicalizePair("Sea Serpent", "Dragon")).not.toBe(
      canonicalizePair("Sea", "Serpent Dragon"),
    );
  });
});

describe("canonicalizePair properties", () => {
  it("is commutative for any pair of strings", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(canonicalizePair(a, b)).toBe(canonicalizePair(b, a));
      }),
      { numRuns: 1000 },
    );
  });

  it("maps distinct unordered pairs to distinct keys", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.string()),
        fc.tuple(fc.string(), fc.string()),
        (pairA, pairB) => {
          const sortedA = [...pairA].sort((left, right) => left.localeCompare(right));
          const sortedB = [...pairB].sort((left, right) => left.localeCompare(right));
          fc.pre(sortedA[0] !== sortedB[0] || sortedA[1] !== sortedB[1]);

          expect(canonicalizePair(pairA[0], pairA[1])).not.toBe(
            canonicalizePair(pairB[0], pairB[1]),
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});
