import { describe, expect, it } from "vitest";

import { validateMatrixStructure } from "./validate-matrix-structure.ts";

function rule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    terreno: "Forest",
    classesFortalecidas: ["Beast"],
    classesEnfraquecidas: ["Fiend"],
    magnitudeFortalecimento: 500,
    magnitudeEnfraquecimento: 500,
    ...overrides,
  };
}

describe("validateMatrixStructure", () => {
  it("aceita entrada valida com listas nao vazias", () => {
    const result = validateMatrixStructure([rule()]);

    expect(result.violations).toEqual([]);
    expect(result.entries).toHaveLength(1);
  });

  it("aceita entrada com listas vazias e magnitude zero", () => {
    const result = validateMatrixStructure([
      rule({
        classesFortalecidas: [],
        classesEnfraquecidas: [],
        magnitudeFortalecimento: 0,
        magnitudeEnfraquecimento: 0,
      }),
    ]);

    expect(result.violations).toEqual([]);
    expect(result.entries).toHaveLength(1);
  });

  it("rejeita terreno vazio apos trim", () => {
    const result = validateMatrixStructure([rule({ terreno: "   " })]);

    expect(result.entries).toEqual([]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.category).toBe("estrutura");
  });

  it("rejeita magnitude negativa", () => {
    const result = validateMatrixStructure([rule({ magnitudeFortalecimento: -1 })]);

    expect(result.entries).toEqual([]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.category).toBe("estrutura");
  });

  it("rejeita classe duplicada dentro de classesFortalecidas", () => {
    const result = validateMatrixStructure([rule({ classesFortalecidas: ["Beast", "Beast"] })]);

    expect(result.entries).toEqual([]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.category).toBe("estrutura");
  });

  it("nao aborta no primeiro elemento invalido e processa o array inteiro", () => {
    const result = validateMatrixStructure([
      rule({ terreno: "   " }),
      rule({ terreno: "Wasteland" }),
    ]);

    expect(result.violations).toHaveLength(1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.terreno).toBe("Wasteland");
  });

  it("rejeita quando a fonte nao e um array", () => {
    const result = validateMatrixStructure({ terreno: "Forest" });

    expect(result.entries).toEqual([]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe("invalid_matrix_shape");
  });
});
