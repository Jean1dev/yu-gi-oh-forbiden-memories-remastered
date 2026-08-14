import { describe, expect, it } from "vitest";

import { TrapEffectSchema } from "./schema.ts";
import { TRAP_EFFECTS, getTrapEffect } from "./table.ts";

const TRAP_NUMBERS = ["681", "682", "683", "684", "685", "686", "687", "688", "689", "690"];

describe("TRAP_EFFECTS", () => {
  it("covers exactly the ten specified trap cards with valid effects", () => {
    expect(Object.keys(TRAP_EFFECTS).sort()).toEqual(TRAP_NUMBERS);
    for (const effect of Object.values(TRAP_EFFECTS)) {
      expect(TrapEffectSchema.safeParse(effect).success).toBe(true);
    }
  });

  it("stores the six attack thresholds exactly", () => {
    expect(TRAP_NUMBERS.slice(0, 6).map((number) => getTrapEffect(number))).toEqual([
      { type: "destroy_attacker", maxAtk: 500 },
      { type: "destroy_attacker", maxAtk: 1000 },
      { type: "destroy_attacker", maxAtk: 1500 },
      { type: "destroy_attacker", maxAtk: 2000 },
      { type: "destroy_attacker", maxAtk: 3000 },
      { type: "destroy_attacker", maxAtk: null },
    ]);
  });

  it("does not resolve inherited object keys", () => {
    for (const key of ["__proto__", "constructor", "toString", "valueOf"]) {
      expect(getTrapEffect(key)).toBeUndefined();
    }
  });

  it("is frozen", () => {
    expect(() => {
      (TRAP_EFFECTS as Record<string, unknown>)["681"] = { type: "decoy" };
    }).toThrow();
  });
});
