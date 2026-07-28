import { describe, expect, it } from "vitest";

import { detectDuplicateTerrain } from "./detect-duplicate-terrain.ts";
import type { TerrainClassRule } from "./types.ts";

function rule(terreno: string): TerrainClassRule {
  return {
    terreno,
    classesFortalecidas: [],
    classesEnfraquecidas: [],
    magnitudeFortalecimento: 0,
    magnitudeEnfraquecimento: 0,
  };
}

describe("detectDuplicateTerrain", () => {
  it("nao gera violacao para terrenos distintos", () => {
    const violations = detectDuplicateTerrain([rule("Forest"), rule("Wasteland")]);

    expect(violations).toEqual([]);
  });

  it("gera violacao citando o terreno repetido", () => {
    const violations = detectDuplicateTerrain([rule("Forest"), rule("Forest")]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.category).toBe("terreno_duplicado");
    expect(violations[0]?.terreno).toBe("Forest");
  });
});
