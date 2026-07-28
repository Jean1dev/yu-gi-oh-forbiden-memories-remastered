import { describe, expect, it } from "vitest";

import { indexFusions, type IndexedFusionRecipe } from "./index-fusions.ts";
import type { FusionRecipeByClasses, FusionRecipeByMaterials } from "./types.ts";

function entry(recipe: IndexedFusionRecipe["recipe"], index: number): IndexedFusionRecipe {
  return { recipe, index };
}

const byMaterials001002: FusionRecipeByMaterials = {
  kind: "materials",
  materials: ["001", "002"],
  result: "099",
};

const byClassesDragonWarrior: FusionRecipeByClasses = {
  kind: "classes",
  classes: ["Dragon", "Warrior"],
  result: "150",
};

describe("indexFusions", () => {
  it("builds the index by material pair keyed canonically", () => {
    const { indexes } = indexFusions([entry(byMaterials001002, 0)]);

    expect(indexes.byMaterialPair.size).toBe(1);
    expect([...indexes.byMaterialPair.values()]).toEqual([byMaterials001002]);
  });

  it("builds the index by class pair keyed canonically", () => {
    const { indexes } = indexFusions([entry(byClassesDragonWarrior, 0)]);

    expect(indexes.byClassPair.size).toBe(1);
    expect([...indexes.byClassPair.values()]).toEqual([byClassesDragonWarrior]);
  });

  it("builds the reverse index by result, aggregating recipes of both kinds", () => {
    const { indexes } = indexFusions([
      entry(byMaterials001002, 0),
      entry({ kind: "classes", classes: ["Beast", "Fiend"], result: "099" }, 1),
    ]);

    expect(indexes.byResult.get("099")).toEqual([
      byMaterials001002,
      { kind: "classes", classes: ["Beast", "Fiend"], result: "099" },
    ]);
  });

  it("reports a conflict when two valid recipes share the same pair with different results", () => {
    const { conflicts } = indexFusions([
      entry(byMaterials001002, 0),
      entry({ kind: "materials", materials: ["002", "001"], result: "150" }, 3),
    ]);

    expect(conflicts).toEqual([
      {
        index: 0,
        reason: "duplicate_pair",
        detail: "Recipes 0, 3: duplicate pair with divergent results.",
      },
      {
        index: 3,
        reason: "duplicate_pair",
        detail: "Recipes 0, 3: duplicate pair with divergent results.",
      },
    ]);
  });

  it("excludes both conflicting recipes from the index", () => {
    const { indexes } = indexFusions([
      entry(byMaterials001002, 0),
      entry({ kind: "materials", materials: ["002", "001"], result: "150" }, 3),
    ]);

    expect(indexes.byMaterialPair.size).toBe(0);
    expect(indexes.byResult.size).toBe(0);
  });

  it("keeps a redundant duplicate — same pair, same result — without reporting a conflict", () => {
    const { indexes, conflicts } = indexFusions([
      entry(byMaterials001002, 0),
      entry({ kind: "materials", materials: ["002", "001"], result: "099" }, 5),
    ]);

    expect(conflicts).toEqual([]);
    expect(indexes.byMaterialPair.size).toBe(1);
  });

  it("finds the same recipe regardless of the order the pair was stored under", () => {
    const { indexes } = indexFusions([entry(byMaterials001002, 0)]);
    const key = [...indexes.byMaterialPair.keys()][0];

    expect(key).toBeDefined();
    expect(indexes.byMaterialPair.get(key ?? "")).toEqual(byMaterials001002);
  });
});
