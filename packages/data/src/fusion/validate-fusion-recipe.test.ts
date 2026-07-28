import { describe, expect, it } from "vitest";

import { createCatalog } from "../catalog/create-catalog.ts";
import type { CardCatalog } from "../catalog/types.ts";
import {
  VALID_SEAL,
  catalogManifest,
  rawCatalogCards,
} from "../../tests/fixtures/catalog-datasets.ts";
import { validateFusionRecipe } from "./validate-fusion-recipe.ts";
import type { FusionRecipeByClasses, FusionRecipeByMaterials } from "./types.ts";

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

function byMaterials(overrides: Partial<FusionRecipeByMaterials> = {}): FusionRecipeByMaterials {
  return {
    kind: "materials",
    materials: ["001", "002"],
    result: "003",
    ...overrides,
  };
}

function byClasses(overrides: Partial<FusionRecipeByClasses> = {}): FusionRecipeByClasses {
  return {
    kind: "classes",
    classes: ["Dragon", "Warrior"],
    result: "003",
    ...overrides,
  };
}

describe("validateFusionRecipe", () => {
  it("approves a by-materials recipe when both numeros exist in the catalog", () => {
    expect(validateFusionRecipe(byMaterials(), 0, catalog)).toEqual({ ok: true });
  });

  it("rejects a by-materials recipe when one material numero does not exist", () => {
    const result = validateFusionRecipe(byMaterials({ materials: ["001", "999"] }), 2, catalog);

    expect(result).toEqual({
      ok: false,
      rejection: {
        index: 2,
        reason: "unknown_material_number",
        detail: "Recipe 2: material '999' does not exist in the catalog.",
      },
    });
  });

  it("rejects a recipe when the result numero does not exist", () => {
    const result = validateFusionRecipe(byMaterials({ result: "999" }), 1, catalog);

    expect(result).toEqual({
      ok: false,
      rejection: {
        index: 1,
        reason: "unknown_result_number",
        detail: "Recipe 1: result '999' does not exist in the catalog.",
      },
    });
  });

  it("approves a by-classes recipe when both classes exist in the catalog", () => {
    expect(validateFusionRecipe(byClasses(), 0, catalog)).toEqual({ ok: true });
  });

  it("rejects a by-classes recipe when one classe does not exist in the catalog", () => {
    const result = validateFusionRecipe(
      byClasses({ classes: ["Dragon", "UnknownClass"] }),
      3,
      catalog,
    );

    expect(result).toEqual({
      ok: false,
      rejection: {
        index: 3,
        reason: "unknown_class",
        detail: "Recipe 3: classe 'UnknownClass' does not exist in the catalog.",
      },
    });
  });

  it("rejects a by-classes recipe when the result numero does not exist", () => {
    const result = validateFusionRecipe(byClasses({ result: "999" }), 4, catalog);

    expect(result).toEqual({
      ok: false,
      rejection: {
        index: 4,
        reason: "unknown_result_number",
        detail: "Recipe 4: result '999' does not exist in the catalog.",
      },
    });
  });
});
