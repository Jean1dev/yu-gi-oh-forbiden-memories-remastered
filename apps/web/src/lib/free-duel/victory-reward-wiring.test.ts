import type { DropPool } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { defaultCommonDropPoolFor } from "./victory-reward-wiring.ts";

describe("defaultCommonDropPoolFor", () => {
  it("falls back to the defeated duelist's own common tier", () => {
    const pool: DropPool = [
      { tier: "common", cardNumbers: ["001", "002"] },
      { tier: "sa-pow", cardNumbers: ["900"] },
    ];

    expect(defaultCommonDropPoolFor(pool)).toEqual(["001", "002"]);
  });

  it("returns an empty pool when the duelist has no common tier", () => {
    const pool: DropPool = [{ tier: "sa-tec", cardNumbers: ["900"] }];

    // Empty means `selectDropCardNumber` refuses rather than inventing a card:
    // no global fallback pool exists, and picking one here would be a made-up
    // balancing value.
    expect(defaultCommonDropPoolFor(pool)).toEqual([]);
  });

  it("returns an empty pool for a duelist with no drop pool at all", () => {
    expect(defaultCommonDropPoolFor([])).toEqual([]);
  });
});
