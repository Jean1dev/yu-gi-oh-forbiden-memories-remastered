import { describe, expect, it } from "vitest";

import { validateClassReferences } from "./validate-class-references.ts";
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

describe("validateClassReferences", () => {
  it("aprova quando toda classe referenciada e conhecida", () => {
    const violations = validateClassReferences(
      [rule({ classesFortalecidas: ["Beast"], classesEnfraquecidas: ["Fiend"] })],
      ["Beast", "Fiend"],
    );

    expect(violations).toEqual([]);
  });

  it("reporta classe desconhecida em classesFortalecidas", () => {
    const violations = validateClassReferences(
      [rule({ classesFortalecidas: ["NoSuchClass"] })],
      ["Beast"],
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.category).toBe("classe_desconhecida");
    expect(violations[0]?.classe).toBe("NoSuchClass");
  });

  it("reporta classe desconhecida em classesEnfraquecidas", () => {
    const violations = validateClassReferences(
      [rule({ classesEnfraquecidas: ["NoSuchClass"] })],
      ["Beast"],
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.category).toBe("classe_desconhecida");
    expect(violations[0]?.classe).toBe("NoSuchClass");
  });
});
