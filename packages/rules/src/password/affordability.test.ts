import { describe, expect, it } from "vitest";
import { evaluateAffordability } from "./affordability.ts";

const price = { stars: 10, source: "catalog" } as const;
describe("evaluateAffordability", () => {
  it("accepts a greater balance", () => expect(evaluateAffordability(price, 11)).toEqual({ status: "affordable", balanceStars: 11 }));
  it("accepts an equal balance", () => expect(evaluateAffordability(price, 10)).toEqual({ status: "affordable", balanceStars: 10 }));
  it("reports the missing stars", () => expect(evaluateAffordability(price, 4)).toEqual({ status: "insufficient", balanceStars: 4, missingStars: 6 }));
  it("keeps an unknown balance fail-safe", () => expect(evaluateAffordability(price, undefined)).toEqual({ status: "unknown" }));
});
