import type { GuardianStar } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createGuardianMatrix } from "./create-matrix.ts";
import type { GuardianMatrix } from "./types.ts";
import { validateMatrixCoverage } from "./validate-coverage.ts";

const FIXED_TIMESTAMP = "2026-07-28T12:00:00.000Z";
const fixedClock = (): string => FIXED_TIMESTAMP;

function matrixFrom(rawEntries: unknown): GuardianMatrix {
  const result = createGuardianMatrix(rawEntries);
  if (!result.ok) {
    throw new Error(`matrix was expected to build: ${result.error.message}`);
  }
  return result.value;
}

describe("validateMatrixCoverage", () => {
  it("marca completo true quando todos os pares esperados estao cobertos", () => {
    const matrix = matrixFrom([
      { atacante: "Sun", defensor: "Sun", resultado: "neutro", bonusAtaque: 0 },
      { atacante: "Sun", defensor: "Moon", resultado: "vantagem", bonusAtaque: 10 },
      { atacante: "Moon", defensor: "Sun", resultado: "desvantagem", bonusAtaque: 10 },
      { atacante: "Moon", defensor: "Moon", resultado: "neutro", bonusAtaque: 0 },
    ]);

    const report = validateMatrixCoverage(matrix, ["Sun", "Moon"], fixedClock);

    expect(report.complete).toBe(true);
    expect(report.missingPairs).toEqual([]);
    expect(report.expectedPairs).toBe(4);
    expect(report.coveredPairs).toBe(4);
  });

  it("marca completo false e lista os pares faltantes quando a matriz esta vazia", () => {
    const matrix = matrixFrom([]);

    const report = validateMatrixCoverage(matrix, ["Sun", "Moon"], fixedClock);

    expect(report.complete).toBe(false);
    expect(report.missingPairs).toEqual([
      { atacante: "Sun", defensor: "Sun" },
      { atacante: "Sun", defensor: "Moon" },
      { atacante: "Moon", defensor: "Sun" },
      { atacante: "Moon", defensor: "Moon" },
    ]);
    expect(report.coveredPairs).toBe(0);
  });

  it("calcula paresEsperados como o quadrado do numero de guardioes usados", () => {
    const matrix = matrixFrom([]);
    const usedGuardianStars: readonly GuardianStar[] = ["Sun", "Moon", "Mars"];

    const report = validateMatrixCoverage(matrix, usedGuardianStars, fixedClock);

    expect(report.expectedPairs).toBe(usedGuardianStars.length ** 2);
  });

  it("nao gera nenhum par faltante quando guardioesUsados esta vazio", () => {
    const matrix = matrixFrom([]);

    const report = validateMatrixCoverage(matrix, [], fixedClock);

    expect(report.missingPairs).toEqual([]);
    expect(report.expectedPairs).toBe(0);
    expect(report.complete).toBe(true);
  });
});

describe("validateMatrixCoverage properties", () => {
  const guardianStarPool: readonly GuardianStar[] = ["Sun", "Moon", "Mars"];

  it("completo é true sse o subconjunto de pares é exatamente o produto cartesiano", () => {
    const pairArb = fc.tuple(
      fc.constantFrom(...guardianStarPool),
      fc.constantFrom(...guardianStarPool),
    );

    fc.assert(
      fc.property(
        fc.uniqueArray(pairArb, { selector: ([atacante, defensor]) => `${atacante}:${defensor}` }),
        (pairs) => {
          const rawEntries = pairs.map(([atacante, defensor]) => ({
            atacante,
            defensor,
            resultado: "neutro",
            bonusAtaque: 0,
          }));
          const matrix = matrixFrom(rawEntries);

          const report = validateMatrixCoverage(matrix, guardianStarPool, fixedClock);
          const fullCartesianProduct = guardianStarPool.length ** 2;

          expect(report.complete).toBe(pairs.length === fullCartesianProduct);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
