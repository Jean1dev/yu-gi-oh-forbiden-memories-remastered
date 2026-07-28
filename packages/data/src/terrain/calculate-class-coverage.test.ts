import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { calculateClassCoverage } from "./calculate-class-coverage.ts";
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

describe("calculateClassCoverage", () => {
  it("retorna lista vazia quando toda classe aparece em algum terreno", () => {
    const report = calculateClassCoverage(
      [rule({ classesFortalecidas: ["Beast"], classesEnfraquecidas: ["Fiend"] })],
      ["Beast", "Fiend"],
    );

    expect(report.classesWithoutCoverage).toEqual([]);
    expect(report.totalCoveredClasses).toBe(2);
    expect(report.totalKnownClasses).toBe(2);
  });

  it("retorna todas as classes quando a matriz esta vazia", () => {
    const report = calculateClassCoverage([], ["Beast", "Dragon", "Fiend"]);

    expect(report.classesWithoutCoverage).toEqual(["Beast", "Dragon", "Fiend"]);
    expect(report.totalCoveredClasses).toBe(0);
    expect(report.totalKnownClasses).toBe(3);
  });

  it("nao conta classe duas vezes quando ela aparece em multiplos terrenos", () => {
    const report = calculateClassCoverage(
      [
        rule({ terreno: "Forest", classesFortalecidas: ["Beast"] }),
        rule({ terreno: "Wasteland", classesFortalecidas: ["Beast"] }),
      ],
      ["Beast", "Fiend"],
    );

    expect(report.totalCoveredClasses).toBe(1);
    expect(report.classesWithoutCoverage).toEqual(["Fiend"]);
  });
});

describe("calculateClassCoverage properties", () => {
  const classPool = ["Aqua", "Beast", "Dragon", "Fiend", "Warrior"] as const;

  it("classesSemCobertura e exatamente o complemento do subconjunto coberto", () => {
    fc.assert(
      fc.property(fc.subarray([...classPool]), (coveredClasses) => {
        const entries: readonly TerrainClassRule[] =
          coveredClasses.length === 0
            ? []
            : [rule({ classesFortalecidas: coveredClasses })];

        const report = calculateClassCoverage(entries, classPool);

        const expectedWithoutCoverage = classPool
          .filter((classe) => !coveredClasses.includes(classe))
          .sort();

        expect(report.classesWithoutCoverage).toEqual(expectedWithoutCoverage);
        expect(report.totalCoveredClasses).toBe(coveredClasses.length);
      }),
      { numRuns: 1000 },
    );
  });
});
