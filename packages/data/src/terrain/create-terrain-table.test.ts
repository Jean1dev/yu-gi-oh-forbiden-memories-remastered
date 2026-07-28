import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createTerrainTable } from "./create-terrain-table.ts";
import type { TerrainClassTable } from "./types.ts";

const KNOWN_CLASSES = ["Beast", "Dragon", "Fiend", "Warrior"] as const;

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    terreno: "Forest",
    classesFortalecidas: ["Beast"],
    classesEnfraquecidas: ["Fiend"],
    magnitudeFortalecimento: 500,
    magnitudeEnfraquecimento: 500,
    ...overrides,
  };
}

function buildOrFail(matrizBruta: unknown, classesConhecidas: readonly string[] = KNOWN_CLASSES): TerrainClassTable {
  const result = createTerrainTable({ matrizBruta, classesConhecidas });
  if (!result.ok) {
    throw new Error(`table was expected to build: ${result.error.message}`);
  }
  return result.value.table;
}

describe("createTerrainTable", () => {
  it("aceita matriz vazia e reporta cobertura zero", () => {
    const result = createTerrainTable({ matrizBruta: [], classesConhecidas: KNOWN_CLASSES });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.table.listTerrenos()).toEqual([]);
    expect(result.value.coverageReport.totalCoveredClasses).toBe(0);
    expect(result.value.coverageReport.classesWithoutCoverage).toEqual([...KNOWN_CLASSES]);
  });

  it("recusa e acumula violacoes de estrutura duplicidade contradicao e referencia juntas", () => {
    const result = createTerrainTable({
      matrizBruta: [
        entry({ terreno: "   " }),
        entry({ terreno: "Mountain" }),
        entry({ terreno: "Mountain" }),
        entry({ terreno: "Sogen", classesFortalecidas: ["Beast"], classesEnfraquecidas: ["Beast"] }),
        entry({ terreno: "Yami", classesFortalecidas: ["NoSuchClass"] }),
      ],
      classesConhecidas: KNOWN_CLASSES,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("terrain_matrix_invalid");
    const violations = result.error.details["violations"] as readonly { category: string }[];
    const categories = violations.map((violation) => violation.category);
    expect(categories).toContain("estrutura");
    expect(categories).toContain("terreno_duplicado");
    expect(categories).toContain("classe_contraditoria");
    expect(categories).toContain("classe_desconhecida");
  });

  it("aceita matriz completa sem violacoes", () => {
    const result = createTerrainTable({
      matrizBruta: [entry({ terreno: "Forest" }), entry({ terreno: "Wasteland", classesFortalecidas: ["Dragon"] })],
      classesConhecidas: KNOWN_CLASSES,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.table.listTerrenos()).toEqual(["Forest", "Wasteland"]);
  });
});

describe("TerrainClassTable", () => {
  it("obterRegraPorTerreno (getRuleByTerreno) retorna undefined para terreno nao carregado", () => {
    const table = buildOrFail([entry({ terreno: "Forest" })]);

    expect(table.getRuleByTerreno("Wasteland")).toBeUndefined();
  });

  it("classificarClasseNoTerreno retorna neutra e magnitude zero para terreno desconhecido", () => {
    const table = buildOrFail([entry({ terreno: "Forest" })]);

    expect(table.classifyClasseInTerreno("Wasteland", "Beast")).toEqual({
      tipo: "neutra",
      magnitude: 0,
    });
  });

  it("classificarClasseNoTerreno retorna fortalecida com a magnitude configurada", () => {
    const table = buildOrFail([
      entry({ terreno: "Forest", classesFortalecidas: ["Beast"], magnitudeFortalecimento: 700 }),
    ]);

    expect(table.classifyClasseInTerreno("Forest", "Beast")).toEqual({
      tipo: "fortalecida",
      magnitude: 700,
    });
  });

  it("classificarClasseNoTerreno retorna enfraquecida com a magnitude configurada", () => {
    const table = buildOrFail([
      entry({ terreno: "Forest", classesEnfraquecidas: ["Fiend"], magnitudeEnfraquecimento: 300 }),
    ]);

    expect(table.classifyClasseInTerreno("Forest", "Fiend")).toEqual({
      tipo: "enfraquecida",
      magnitude: 300,
    });
  });

  it("classificarClasseNoTerreno retorna neutra quando a classe nao esta listada naquele terreno", () => {
    const table = buildOrFail([
      entry({ terreno: "Forest", classesFortalecidas: ["Beast"], classesEnfraquecidas: ["Fiend"] }),
    ]);

    expect(table.classifyClasseInTerreno("Forest", "Dragon")).toEqual({
      tipo: "neutra",
      magnitude: 0,
    });
  });

  it("listarTerrenos retorna em ordem alfabetica independente da ordem do arquivo", () => {
    const table = buildOrFail([
      entry({ terreno: "Yami", classesFortalecidas: [], classesEnfraquecidas: [] }),
      entry({ terreno: "Forest", classesFortalecidas: [], classesEnfraquecidas: [] }),
      entry({ terreno: "Mountain", classesFortalecidas: [], classesEnfraquecidas: [] }),
    ]);

    expect(table.listTerrenos()).toEqual(["Forest", "Mountain", "Yami"]);
  });

  it("tentativa de escrita em uma regra retornada lanca TypeError", () => {
    const table = buildOrFail([entry({ terreno: "Forest" })]);
    const rule = table.getRuleByTerreno("Forest");

    expect(rule).toBeDefined();
    expect(() => {
      (rule as { terreno: string }).terreno = "Wasteland";
    }).toThrow(TypeError);
  });
});

describe("createTerrainTable properties", () => {
  const terrainPool = ["Forest", "Wasteland", "Mountain"] as const;
  const classePool = KNOWN_CLASSES;

  it("classificacao e sempre definida: nunca lanca e sempre devolve um tipo valido", () => {
    const table = buildOrFail([
      entry({ terreno: "Forest", classesFortalecidas: ["Beast"], classesEnfraquecidas: ["Fiend"] }),
    ]);

    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (terreno, classe) => {
          const classification = table.classifyClasseInTerreno(terreno, classe);
          expect(["fortalecida", "enfraquecida", "neutra"]).toContain(classification.tipo);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("neutralidade fora da tabela: terreno nao presente no indice e sempre neutra", () => {
    const table = buildOrFail([entry({ terreno: "Forest" })]);

    fc.assert(
      fc.property(
        fc.string().filter((terreno) => terreno !== "Forest"),
        fc.constantFrom(...classePool),
        (terreno, classe) => {
          expect(table.classifyClasseInTerreno(terreno, classe)).toEqual({
            tipo: "neutra",
            magnitude: 0,
          });
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("nenhuma classe contraditoria sobrevive a construcao", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...terrainPool),
        fc.constantFrom(...classePool),
        (terreno, classe) => {
          const result = createTerrainTable({
            matrizBruta: [
              entry({ terreno, classesFortalecidas: [classe], classesEnfraquecidas: [classe] }),
            ],
            classesConhecidas: KNOWN_CLASSES,
          });

          expect(result.ok).toBe(false);
          if (result.ok) {
            return;
          }
          const violations = result.error.details["violations"] as readonly { category: string }[];
          expect(violations.some((violation) => violation.category === "classe_contraditoria")).toBe(
            true,
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});
