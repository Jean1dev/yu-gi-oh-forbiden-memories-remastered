import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createCatalog } from "../catalog/create-catalog.ts";
import type { CardCatalog } from "../catalog/types.ts";
import {
  VALID_SEAL,
  catalogManifest,
  rawCatalogCards,
} from "../../tests/fixtures/catalog-datasets.ts";
import { createFusionTable, type CreateFusionTableOutput } from "./create-fusion-table.ts";
import { validateFusionRecipe } from "./validate-fusion-recipe.ts";
import type { FusionRecipe } from "./types.ts";

const FIXED_NOW = "2026-07-27T12:10:00.000Z";

/** The fixture catalog carries numeros 001/002/003/700/701/702 and their classes. */
function buildCatalog(): CardCatalog {
  const result = createCatalog({
    rawCards: rawCatalogCards(),
    manifest: catalogManifest(),
    seal: VALID_SEAL,
  });
  if (!result.ok) {
    throw new Error(`catalog was expected to build: ${result.error.message}`);
  }
  return result.value;
}

const catalog = buildCatalog();

function createOrFail(rawRecipes: unknown): CreateFusionTableOutput {
  const result = createFusionTable({ rawRecipes, catalog, now: () => FIXED_NOW });
  if (!result.ok) {
    throw new Error(`fusion table was expected to build: ${result.error.message}`);
  }
  return result.value;
}

describe("createFusionTable", () => {
  it("fails with fusion_file_invalid when the raw input is not an array", () => {
    const result = createFusionTable({ rawRecipes: { recipes: [] }, catalog, now: () => FIXED_NOW });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("fusion_file_invalid");
  });

  it("builds an empty table when the input is an empty array", () => {
    const { table, report } = createOrFail([]);

    expect(report).toEqual({
      totalInFile: 0,
      validRecipes: 0,
      rejectedRecipes: [],
      generatedAt: FIXED_NOW,
    });
    expect(table.listAllRecipes()).toEqual([]);
    expect(table.countRecipes()).toEqual({ byMaterials: 0, byClasses: 0 });
  });

  it("excludes an individually invalid recipe without aborting the rest", () => {
    const { table, report } = createOrFail([
      { kind: "materials", materials: ["001", "999"], result: "003" },
      { kind: "materials", materials: ["001", "002"], result: "003" },
    ]);

    expect(report.rejectedRecipes).toHaveLength(1);
    expect(table.findByMaterialPair("001", "002")).toEqual({
      kind: "materials",
      materials: ["001", "002"],
      result: "003",
    });
  });

  it("reports each rejected recipe with its index and reason", () => {
    const { report } = createOrFail([
      { kind: "materials", materials: ["001", "002"] }, // missing result -> schema
      { kind: "materials", materials: ["001", "999"], result: "003" }, // unknown material
      { kind: "classes", classes: ["Dragon", "NoSuchClass"], result: "003" }, // unknown classe
    ]);

    expect(report.rejectedRecipes).toEqual([
      { index: 0, reason: "invalid_schema", detail: "Recipe 0: invalid format." },
      {
        index: 1,
        reason: "unknown_material_number",
        detail: "Recipe 1: material '999' does not exist in the catalog.",
      },
      {
        index: 2,
        reason: "unknown_class",
        detail: "Recipe 2: classe 'NoSuchClass' does not exist in the catalog.",
      },
    ]);
  });

  it("counts validRecipes and totalInFile correctly", () => {
    const { report } = createOrFail([
      { kind: "materials", materials: ["001", "002"], result: "003" },
      { kind: "classes", classes: ["Dragon", "Warrior"], result: "700" },
      { kind: "materials", materials: ["001", "999"], result: "003" },
    ]);

    expect(report.totalInFile).toBe(3);
    expect(report.validRecipes).toBe(2);
  });
});

describe("FusionTable built from createFusionTable", () => {
  it("findByMaterialPair finds the recipe regardless of the order the materials were given", () => {
    const { table } = createOrFail([{ kind: "materials", materials: ["001", "002"], result: "003" }]);

    expect(table.findByMaterialPair("002", "001")).toEqual(table.findByMaterialPair("001", "002"));
    expect(table.findByMaterialPair("001", "002")?.result).toBe("003");
  });

  it("findByMaterialPair returns undefined when the pair has no recipe", () => {
    const { table } = createOrFail([]);

    expect(table.findByMaterialPair("001", "002")).toBeUndefined();
  });

  it("findByClassPair finds the recipe regardless of the order the classes were given", () => {
    const { table } = createOrFail([
      { kind: "classes", classes: ["Dragon", "Warrior"], result: "003" },
    ]);

    expect(table.findByClassPair("Warrior", "Dragon")).toEqual(
      table.findByClassPair("Dragon", "Warrior"),
    );
    expect(table.findByClassPair("Dragon", "Warrior")?.result).toBe("003");
  });

  it("listByResult aggregates by-materials and by-classes recipes that produce the same numero", () => {
    const { table } = createOrFail([
      { kind: "materials", materials: ["001", "002"], result: "003" },
      { kind: "classes", classes: ["Magic", "Trap"], result: "003" },
    ]);

    expect(table.listByResult("003")).toHaveLength(2);
  });

  it("listAllRecipes returns only the valid, indexed recipes", () => {
    const { table } = createOrFail([
      { kind: "materials", materials: ["001", "002"], result: "003" },
      { kind: "materials", materials: ["001", "999"], result: "003" },
    ]);

    expect(table.listAllRecipes()).toEqual([
      { kind: "materials", materials: ["001", "002"], result: "003" },
    ]);
  });

  it("countRecipes reflects the total per kind after excluding invalid and conflicting recipes", () => {
    const { table } = createOrFail([
      { kind: "materials", materials: ["001", "002"], result: "003" },
      { kind: "materials", materials: ["002", "001"], result: "700" }, // conflicts with the one above
      { kind: "classes", classes: ["Dragon", "Warrior"], result: "700" },
    ]);

    expect(table.countRecipes()).toEqual({ byMaterials: 0, byClasses: 1 });
  });
});

const KNOWN_NUMEROS = ["001", "002", "003", "700", "701", "702"] as const;
const UNKNOWN_NUMEROS = ["050", "060", "070", "080", "090"] as const;
const KNOWN_CLASSES_FIXTURE = ["Dragon", "Beast-Warrior", "Warrior", "Magic", "Trap", "Ritual"] as const;
const UNKNOWN_CLASSES_FIXTURE = ["Unknown-A", "Unknown-B", "Unknown-C"] as const;

const numeroArb = fc.constantFrom(...KNOWN_NUMEROS, ...UNKNOWN_NUMEROS);
const classeArb = fc.constantFrom(...KNOWN_CLASSES_FIXTURE, ...UNKNOWN_CLASSES_FIXTURE);

const materialsRecipeArb = fc.record({
  kind: fc.constant("materials" as const),
  materials: fc.tuple(numeroArb, numeroArb),
  result: numeroArb,
});

const classesRecipeArb = fc.record({
  kind: fc.constant("classes" as const),
  classes: fc.tuple(classeArb, classeArb),
  result: numeroArb,
});

const recipeArb: fc.Arbitrary<FusionRecipe> = fc.oneof(materialsRecipeArb, classesRecipeArb);

describe("createFusionTable properties", () => {
  it("never lets a rejected or conflicting recipe reach listAllRecipes", () => {
    fc.assert(
      fc.property(fc.array(recipeArb, { maxLength: 12 }), (recipes) => {
        const result = createFusionTable({ rawRecipes: recipes, catalog, now: () => FIXED_NOW });
        if (!result.ok) {
          return;
        }
        for (const recipe of result.value.table.listAllRecipes()) {
          expect(validateFusionRecipe(recipe, 0, catalog)).toEqual({ ok: true });
        }
      }),
      { numRuns: 200 },
    );
  });

  it("produces the same rejectedRecipes for the same input, ignoring generatedAt", () => {
    fc.assert(
      fc.property(fc.array(recipeArb, { maxLength: 12 }), (recipes) => {
        const first = createFusionTable({
          rawRecipes: recipes,
          catalog,
          now: () => "2026-01-01T00:00:00.000Z",
        });
        const second = createFusionTable({
          rawRecipes: recipes,
          catalog,
          now: () => "2026-01-02T00:00:00.000Z",
        });

        expect(second.ok).toBe(first.ok);
        if (!first.ok || !second.ok) {
          return;
        }
        expect(second.value.report.rejectedRecipes).toEqual(first.value.report.rejectedRecipes);
        expect(second.value.report.validRecipes).toBe(first.value.report.validRecipes);
        expect(second.value.report.totalInFile).toBe(first.value.report.totalInFile);
      }),
      { numRuns: 200 },
    );
  });

  it("findByMaterialPair is order independent for every indexed pair", () => {
    fc.assert(
      fc.property(fc.array(recipeArb, { maxLength: 12 }), (recipes) => {
        const result = createFusionTable({ rawRecipes: recipes, catalog, now: () => FIXED_NOW });
        if (!result.ok) {
          return;
        }
        for (const recipe of result.value.table.listAllRecipes()) {
          if (recipe.kind !== "materials") {
            continue;
          }
          const [a, b] = recipe.materials;
          expect(result.value.table.findByMaterialPair(a, b)).toEqual(
            result.value.table.findByMaterialPair(b, a),
          );
        }
      }),
      { numRuns: 200 },
    );
  });
});
