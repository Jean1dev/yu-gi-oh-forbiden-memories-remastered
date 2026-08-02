import { CardPasswordSchema } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalizePasswordInput } from "./normalize.ts";

describe("password normalization properties", () => {
  it("is invariant to whitespace and idempotent", () => fc.assert(fc.property(fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 8 }), (digits) => {
    const compact = digits.join("");
    const spaced = digits.join(" \t");
    const canonical = normalizePasswordInput(compact);
    expect(normalizePasswordInput(spaced)).toEqual(canonical);
    expect(canonical.status).toBe("canonical");
    if (canonical.status === "canonical") {
      expect(normalizePasswordInput(canonical.value)).toEqual(canonical);
      expect(CardPasswordSchema.safeParse(canonical.value).success).toBe(true);
    }
  })));
  it("never throws for arbitrary strings", () => fc.assert(fc.property(fc.string(), (raw) => {
    expect(() => normalizePasswordInput(raw)).not.toThrow();
    return true;
  })));
});
