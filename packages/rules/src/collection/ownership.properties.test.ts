import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { copyLimit } from "./ownership.ts";

describe("copyLimit domain property", () => {
  it("is always in [0, 3] and never greater than the owned quantity, for any integer in [0, 10000]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), (quantity) => {
        const limit = copyLimit(quantity);
        expect(limit).toBeGreaterThanOrEqual(0);
        expect(limit).toBeLessThanOrEqual(3);
        expect(limit).toBeLessThanOrEqual(quantity);
      }),
      { numRuns: 1000 },
    );
  });
});
