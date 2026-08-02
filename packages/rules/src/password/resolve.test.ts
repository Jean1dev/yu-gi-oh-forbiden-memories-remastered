import { describe, expect, it, vi } from "vitest";
import { resolvePasswordEntry } from "./resolve.ts";
import { passwordTestCard } from "./test-card.ts";

describe("resolvePasswordEntry", () => {
  it("resolves a card, price and affordability", () => expect(resolvePasswordEntry({ rawInput: "89631139", lookup: () => passwordTestCard({ estrelas: 10 }), balanceStars: 10 })).toMatchObject({ status: "resolved", price: { stars: 10 }, affordability: { status: "affordable" } }));
  it("does not call lookup for malformed input", () => { const lookup = vi.fn(); expect(resolvePasswordEntry({ rawInput: "bad", lookup, balanceStars: 0 })).toMatchObject({ status: "invalid_format" }); expect(lookup).not.toHaveBeenCalled(); });
  it("returns not_found with the canonical password", () => expect(resolvePasswordEntry({ rawInput: "00000000", lookup: () => undefined, balanceStars: 0 })).toEqual({ status: "not_found", canonicalPassword: "00 00 00 00" }));
  it("uses the fallback price", () => expect(resolvePasswordEntry({ rawInput: "89631139", lookup: () => passwordTestCard({ estrelas: null }), balanceStars: 0 })).toMatchObject({ status: "resolved", price: { stars: 999_999, source: "fallback" } }));
});
