import { describe, expect, it } from "vitest";

import { detectContradictoryClass } from "./detect-contradictory-class.ts";
import type { TerrainClassRule } from "./types.ts";

function rule(overrides: Partial<TerrainClassRule> = {}): TerrainClassRule {
  return {
    terreno: "Forest",
    classesFortalecidas: [],
    classesEnfraquecidas: [],
    magnitudeFortalecimento: 0,
    magnitudeEnfraquecimento: 0,
    ...overrides,
  };
}

describe("detectContradictoryClass", () => {
  it("nao gera violacao quando as listas nao se sobrepoem", () => {
    const violations = detectContradictoryClass([
      rule({ classesFortalecidas: ["Beast"], classesEnfraquecidas: ["Fiend"] }),
    ]);

    expect(violations).toEqual([]);
  });

  it("gera violacao para classe presente nas duas listas do mesmo terreno", () => {
    const violations = detectContradictoryClass([
      rule({ classesFortalecidas: ["Beast"], classesEnfraquecidas: ["Beast"] }),
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.category).toBe("classe_contraditoria");
    expect(violations[0]?.terreno).toBe("Forest");
    expect(violations[0]?.classe).toBe("Beast");
  });
});
