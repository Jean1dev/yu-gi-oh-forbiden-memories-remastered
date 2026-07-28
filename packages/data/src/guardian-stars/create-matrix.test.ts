import { GUARDIAN_STARS, type GuardianStar } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  duplicatePairSource,
  emptySource,
  incoherentEntrySource,
  unknownGuardianSource,
  validSource,
} from "../../tests/fixtures/guardian-matrix-datasets.ts";
import { createGuardianMatrix } from "./create-matrix.ts";

describe("createGuardianMatrix", () => {
  it("aceita array vazio e devolve matriz de tamanho zero", () => {
    const result = createGuardianMatrix(emptySource());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.size()).toBe(0);
      expect(result.value.listEntries()).toEqual([]);
    }
  });

  it("indexa entradas válidas por par ordenado atacante e defensor", () => {
    const result = createGuardianMatrix(validSource());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.queryCompatibility("Sun", "Moon")).toEqual({
      atacante: "Sun",
      defensor: "Moon",
      resultado: "vantagem",
      bonusAtaque: 10,
    });
    expect(result.value.queryCompatibility("Moon", "Sun")).toEqual({
      atacante: "Moon",
      defensor: "Sun",
      resultado: "desvantagem",
      bonusAtaque: 10,
    });
  });

  it("rejeita duas entradas com o mesmo par atacante e defensor", () => {
    const result = createGuardianMatrix(duplicatePairSource());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("duplicate_guardian_pair");
    }
  });

  it("aborta tudo-ou-nada quando qualquer entrada falha a normalização", () => {
    expect(createGuardianMatrix(incoherentEntrySource()).ok).toBe(false);
    expect(createGuardianMatrix(unknownGuardianSource()).ok).toBe(false);
  });

  it("congela a lista de entradas retornada por listarEntradas", () => {
    const result = createGuardianMatrix(validSource());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.value.listEntries())).toBe(true);
      for (const entry of result.value.listEntries()) {
        expect(Object.isFrozen(entry)).toBe(true);
      }
    }
  });

  it("reporta tamanho igual ao numero de entradas validas", () => {
    const result = createGuardianMatrix(validSource());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.size()).toBe(result.value.listEntries().length);
    }
  });
});

describe("GuardianMatrix.queryCompatibility", () => {
  it("devolve a entrada exata quando o par existe", () => {
    const result = createGuardianMatrix(validSource());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.queryCompatibility("Sun", "Sun")).toEqual({
      atacante: "Sun",
      defensor: "Sun",
      resultado: "neutro",
      bonusAtaque: 0,
    });
  });

  it("devolve fallback neutro quando o par nao existe", () => {
    const result = createGuardianMatrix(validSource());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.queryCompatibility("Mars", "Venus")).toEqual({
      atacante: "Mars",
      defensor: "Venus",
      resultado: "neutro",
      bonusAtaque: 0,
    });
  });

  it("devolve fallback neutro para qualquer par em matriz vazia", () => {
    const result = createGuardianMatrix(emptySource());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    fc.assert(
      fc.property(
        fc.constantFrom<GuardianStar>(...GUARDIAN_STARS),
        fc.constantFrom<GuardianStar>(...GUARDIAN_STARS),
        (atacante, defensor) => {
          expect(result.value.queryCompatibility(atacante, defensor)).toEqual({
            atacante,
            defensor,
            resultado: "neutro",
            bonusAtaque: 0,
          });
        },
      ),
    );
  });

  it("nunca lanca para nenhuma combinacao dos dez guardioes", () => {
    const result = createGuardianMatrix(validSource());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    for (const atacante of GUARDIAN_STARS) {
      for (const defensor of GUARDIAN_STARS) {
        expect(() => result.value.queryCompatibility(atacante, defensor)).not.toThrow();
      }
    }
  });
});
