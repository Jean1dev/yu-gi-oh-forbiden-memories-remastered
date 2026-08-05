import { describe, expect, it } from "vitest";
import { normalizeFmBasicParameters } from "./normalize-parameters.ts";

describe("normalizeFmBasicParameters", () => {
  it("applies defaults and preserves valid values", () => {
    expect(normalizeFmBasicParameters({})).toEqual({ aggression: 0.5, playsSpells: true, playsFieldSpells: false, defensiveThreshold: 0 });
    expect(normalizeFmBasicParameters({ aggression: 1, playsSpells: false, playsFieldSpells: true, defensiveThreshold: 200 })).toEqual({ aggression: 1, playsSpells: false, playsFieldSpells: true, defensiveThreshold: 200 });
  });

  it("replaces invalid values independently", () => {
    expect(normalizeFmBasicParameters({ aggression: 2, defensiveThreshold: -1 })).toMatchObject({ aggression: 0.5, defensiveThreshold: 0 });
  });
});
