import { describe, expect, it } from "vitest";

import { createMulberry32 } from "./mulberry32.ts";

describe("createMulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createMulberry32(42);
    const b = createMulberry32(42);

    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());

    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createMulberry32(1);
    const b = createMulberry32(2);

    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());

    expect(sequenceA).not.toEqual(sequenceB);
  });

  it("always returns a value in [0, 1)", () => {
    const next = createMulberry32(1753617600);

    for (let i = 0; i < 1000; i++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
