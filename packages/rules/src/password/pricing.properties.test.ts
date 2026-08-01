import fc from "fast-check";
import { expect, it } from "vitest";
import { resolveCardPrice } from "./pricing.ts";
import { passwordTestCard } from "./test-card.ts";

it("always resolves a non-negative integer price", () => fc.assert(fc.property(fc.option(fc.nat(), { nil: null }), (stars) => {
  const price = resolveCardPrice(passwordTestCard({ estrelas: stars }));
  expect(Number.isInteger(price.stars)).toBe(true);
  expect(price.stars).toBeGreaterThanOrEqual(0);
})));
