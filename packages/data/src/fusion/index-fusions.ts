import type { CardNumber } from "@yugioh/shared";

import { canonicalizePair } from "./canonicalize-pair.ts";
import type {
  FusionIndexes,
  FusionRecipe,
  FusionRecipeByClasses,
  FusionRecipeByMaterials,
  RejectedFusionRecipe,
} from "./types.ts";

/** A schema- and catalog-valid recipe, still carrying its position in the raw file. */
export type IndexedFusionRecipe = Readonly<{
  recipe: FusionRecipe;
  index: number;
}>;

type IndexedRecipeByMaterials = Readonly<{ recipe: FusionRecipeByMaterials; index: number }>;
type IndexedRecipeByClasses = Readonly<{ recipe: FusionRecipeByClasses; index: number }>;

function isByMaterials(entry: IndexedFusionRecipe): entry is IndexedRecipeByMaterials {
  return entry.recipe.kind === "materials";
}

function isByClasses(entry: IndexedFusionRecipe): entry is IndexedRecipeByClasses {
  return entry.recipe.kind === "classes";
}

function groupByKey<T>(entries: readonly T[], keyOf: (entry: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    const bucket = groups.get(key);
    if (bucket === undefined) {
      groups.set(key, [entry]);
    } else {
      bucket.push(entry);
    }
  }
  return groups;
}

type GroupResolution<T extends IndexedFusionRecipe> =
  | Readonly<{ accepted: T }>
  | Readonly<{ conflict: readonly T[] }>;

/**
 * A canonical key shared by more than one valid recipe is only a conflict if
 * the recipes disagree on the result — the same recipe listed twice with the
 * same result is redundant, not contradictory (spec F05, Decision 8).
 */
function resolveGroup<T extends IndexedFusionRecipe>(entries: readonly T[]): GroupResolution<T> {
  const distinctResults = new Set(entries.map((entry) => entry.recipe.result));
  if (distinctResults.size > 1) {
    return { conflict: entries };
  }
  const [accepted] = [...entries].sort((left, right) => left.index - right.index);
  return { accepted: accepted! };
}

function conflictRejections(entries: readonly IndexedFusionRecipe[]): readonly RejectedFusionRecipe[] {
  const indices = entries.map((entry) => entry.index).join(", ");
  return entries.map((entry) => ({
    index: entry.index,
    reason: "duplicate_pair",
    detail: `Recipes ${indices}: duplicate pair with divergent results.`,
  }));
}

function pushResult(index: Map<CardNumber, FusionRecipe[]>, recipe: FusionRecipe): void {
  const bucket = index.get(recipe.result);
  if (bucket === undefined) {
    index.set(recipe.result, [recipe]);
  } else {
    bucket.push(recipe);
  }
}

function sealResultBuckets(
  index: Map<CardNumber, FusionRecipe[]>,
): ReadonlyMap<CardNumber, readonly FusionRecipe[]> {
  const sealed = new Map<CardNumber, readonly FusionRecipe[]>();
  for (const [numero, bucket] of index) {
    sealed.set(numero, Object.freeze(bucket));
  }
  return sealed;
}

/**
 * Builds the three fusion indexes from recipes that already passed schema and
 * catalog validation, excluding and reporting any canonical pair shared by
 * recipes with divergent results (spec F05, Decision 8: both sides of a
 * conflict are excluded, neither "wins").
 */
export function indexFusions(validRecipes: readonly IndexedFusionRecipe[]): Readonly<{
  indexes: FusionIndexes;
  conflicts: readonly RejectedFusionRecipe[];
}> {
  const materialEntries = validRecipes.filter(isByMaterials);
  const classEntries = validRecipes.filter(isByClasses);

  const byMaterialPair = new Map<string, FusionRecipeByMaterials>();
  const byClassPair = new Map<string, FusionRecipeByClasses>();
  const byResult = new Map<CardNumber, FusionRecipe[]>();
  const conflicts: RejectedFusionRecipe[] = [];

  const materialGroups = groupByKey(materialEntries, (entry) =>
    canonicalizePair(entry.recipe.materials[0], entry.recipe.materials[1]),
  );
  for (const [key, group] of materialGroups) {
    const resolution = resolveGroup(group);
    if ("conflict" in resolution) {
      conflicts.push(...conflictRejections(resolution.conflict));
      continue;
    }
    const recipe = resolution.accepted.recipe;
    byMaterialPair.set(key, recipe);
    pushResult(byResult, recipe);
  }

  const classGroups = groupByKey(classEntries, (entry) =>
    canonicalizePair(entry.recipe.classes[0], entry.recipe.classes[1]),
  );
  for (const [key, group] of classGroups) {
    const resolution = resolveGroup(group);
    if ("conflict" in resolution) {
      conflicts.push(...conflictRejections(resolution.conflict));
      continue;
    }
    const recipe = resolution.accepted.recipe;
    byClassPair.set(key, recipe);
    pushResult(byResult, recipe);
  }

  return {
    indexes: Object.freeze({
      byMaterialPair: Object.freeze(byMaterialPair),
      byClassPair: Object.freeze(byClassPair),
      byResult: sealResultBuckets(byResult),
    }),
    conflicts,
  };
}
