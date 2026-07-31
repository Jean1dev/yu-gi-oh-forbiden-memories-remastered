import { describe, expect, it } from "vitest";
import { resolveCardPrice } from "./pricing.ts";
import { passwordTestCard } from "./test-card.ts";

describe("resolveCardPrice", () => {
  it("uses the catalog price", () => expect(resolveCardPrice(passwordTestCard({ estrelas: 10 }))).toEqual({ stars: 10, source: "catalog" }));
  it("preserves zero", () => expect(resolveCardPrice(passwordTestCard({ estrelas: 0 }))).toEqual({ stars: 0, source: "catalog" }));
  it("falls back for an absent price", () => expect(resolveCardPrice(passwordTestCard({ estrelas: null }))).toEqual({ stars: 999_999, source: "fallback" }));
  it("distinguishes a catalog price of 999999", () => expect(resolveCardPrice(passwordTestCard())).toEqual({ stars: 999_999, source: "catalog" }));
});
