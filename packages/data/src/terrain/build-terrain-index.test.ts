import { describe, expect, it } from "vitest";

import { buildTerrainIndex } from "./build-terrain-index.ts";
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

describe("buildTerrainIndex", () => {
  it("indexa cada entrada pelo proprio terreno", () => {
    const forest = rule("Forest");
    const wasteland = rule("Wasteland");

    const index = buildTerrainIndex([forest, wasteland]);

    expect(index.get("Forest")).toBe(forest);
    expect(index.get("Wasteland")).toBe(wasteland);
    expect(index.size).toBe(2);
  });

  it("devolve mapa vazio para entradas vazias", () => {
    expect(buildTerrainIndex([]).size).toBe(0);
  });
});
