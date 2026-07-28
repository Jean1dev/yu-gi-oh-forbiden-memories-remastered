import { GUARDIAN_STARS, type GuardianStar } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { normalizeMatrixEntry } from "./normalize-entry.ts";
import type { GuardianCompatibilityResult } from "./types.ts";

describe("normalizeMatrixEntry", () => {
  it("aceita entrada neutra com bonusAtaque zero", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Sun",
      resultado: "neutro",
      bonusAtaque: 0,
    });

    expect(result.ok).toBe(true);
  });

  it("aceita entrada com resultado vantagem e bonusAtaque positivo", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "vantagem",
      bonusAtaque: 10,
    });

    expect(result.ok).toBe(true);
  });

  it("aceita entrada com resultado desvantagem e bonusAtaque positivo", () => {
    const result = normalizeMatrixEntry({
      atacante: "Moon",
      defensor: "Sun",
      resultado: "desvantagem",
      bonusAtaque: 10,
    });

    expect(result.ok).toBe(true);
  });

  it("rejeita guardião atacante fora dos dez conhecidos", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sunlight",
      defensor: "Moon",
      resultado: "neutro",
      bonusAtaque: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_matrix_entry");
    }
  });

  it("rejeita guardião defensor fora dos dez conhecidos", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moonlight",
      resultado: "neutro",
      bonusAtaque: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_matrix_entry");
    }
  });

  it("rejeita resultado fora do enum de três valores", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "empate",
      bonusAtaque: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_matrix_entry");
    }
  });

  it("rejeita bonusAtaque negativo", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "vantagem",
      bonusAtaque: -5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_matrix_entry");
    }
  });

  it("rejeita bonusAtaque não inteiro", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "vantagem",
      bonusAtaque: 1.5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_matrix_entry");
    }
  });

  it("rejeita resultado neutro com bonusAtaque diferente de zero", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "neutro",
      bonusAtaque: 5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("incoherent_result_bonus");
    }
  });

  it("rejeita resultado vantagem com bonusAtaque zero", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "vantagem",
      bonusAtaque: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("incoherent_result_bonus");
    }
  });

  it("rejeita resultado desvantagem com bonusAtaque zero", () => {
    const result = normalizeMatrixEntry({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "desvantagem",
      bonusAtaque: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("incoherent_result_bonus");
    }
  });
});

describe("normalizeMatrixEntry properties", () => {
  const guardianStar = fc.constantFrom<GuardianStar>(...GUARDIAN_STARS);
  const compatibilityResult = fc.constantFrom<GuardianCompatibilityResult>(
    "vantagem",
    "desvantagem",
    "neutro",
  );

  it("aceita a entrada sse (resultado === neutro) === (bonusAtaque === 0)", () => {
    fc.assert(
      fc.property(
        guardianStar,
        guardianStar,
        compatibilityResult,
        fc.integer({ min: 0, max: 999 }),
        (atacante, defensor, resultado, bonusAtaque) => {
          const result = normalizeMatrixEntry({ atacante, defensor, resultado, bonusAtaque });
          const expectedOk = (resultado === "neutro") === (bonusAtaque === 0);

          expect(result.ok).toBe(expectedOk);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
