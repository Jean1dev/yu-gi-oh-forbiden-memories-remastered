import { DomainError, err, ok, type CardNumber, type Result } from "@yugioh/shared";

import type { CardCatalog } from "../catalog/types.ts";
import { canonicalizePair } from "./canonicalize-pair.ts";
import { FusionFileSchema, FusionRecipeSchema } from "./schema.ts";
import { indexFusions, type IndexedFusionRecipe } from "./index-fusions.ts";
import { validateFusionRecipe } from "./validate-fusion-recipe.ts";
import type {
  FusionRecipe,
  FusionRecipeByClasses,
  FusionRecipeByMaterials,
  FusionReport,
  FusionTable,
  RejectedFusionRecipe,
} from "./types.ts";

export type CreateFusionTableInput = Readonly<{
  /** `JSON.parse` of `fusions.json`, still untrusted. */
  rawRecipes: unknown;
  /** Already loaded by F03 — this feature never builds its own catalog. */
  catalog: CardCatalog;
  /** Injected so the orchestrator stays pure and reproducible. */
  now: () => string;
}>;

export type CreateFusionTableOutput = Readonly<{
  table: FusionTable;
  report: FusionReport;
}>;

const NO_RESULT_RECIPES: readonly FusionRecipe[] = Object.freeze([]);

function buildFusionTable(
  byMaterialPair: ReadonlyMap<string, FusionRecipeByMaterials>,
  byClassPair: ReadonlyMap<string, FusionRecipeByClasses>,
  byResult: ReadonlyMap<CardNumber, readonly FusionRecipe[]>,
): FusionTable {
  const allRecipes: readonly FusionRecipe[] = Object.freeze([
    ...byMaterialPair.values(),
    ...byClassPair.values(),
  ]);

  return Object.freeze({
    findByMaterialPair(materialA, materialB) {
      return byMaterialPair.get(canonicalizePair(materialA, materialB));
    },
    findByClassPair(classA, classB) {
      return byClassPair.get(canonicalizePair(classA, classB));
    },
    listByResult(numero) {
      return byResult.get(numero) ?? NO_RESULT_RECIPES;
    },
    listAllRecipes() {
      return allRecipes;
    },
    countRecipes() {
      return Object.freeze({ byMaterials: byMaterialPair.size, byClasses: byClassPair.size });
    },
  });
}

/**
 * Runs the whole fusion pipeline over an already-read raw array and an
 * already-loaded catalog: schema check, per-recipe catalog validation and
 * indexing, none of which ever aborts the batch over a single bad recipe
 * (spec F05, Decision 6) — the only abort path is the top level not being an
 * array at all.
 *
 * An empty `rawRecipes` array is success, not an error: it is the expected
 * state while the real fusion values remain a pending external dataset
 * (spec F05, Decision 10). Every query on the resulting table then answers
 * "no known fusion" rather than failing.
 */
export function createFusionTable(
  input: CreateFusionTableInput,
): Result<CreateFusionTableOutput, DomainError> {
  const parsedFile = FusionFileSchema.safeParse(input.rawRecipes);
  if (!parsedFile.success) {
    return err(
      new DomainError(
        "Fusion file malformed — expected an array of recipes.",
        "fusion_file_invalid",
      ),
    );
  }

  const rejected: RejectedFusionRecipe[] = [];
  const validEntries: IndexedFusionRecipe[] = [];

  parsedFile.data.forEach((rawRecipe, index) => {
    const parsedRecipe = FusionRecipeSchema.safeParse(rawRecipe);
    if (!parsedRecipe.success) {
      rejected.push({
        index,
        reason: "invalid_schema",
        detail: `Recipe ${String(index)}: invalid format.`,
      });
      return;
    }

    const validation = validateFusionRecipe(parsedRecipe.data, index, input.catalog);
    if (!validation.ok) {
      rejected.push(validation.rejection);
      return;
    }

    validEntries.push({ recipe: parsedRecipe.data, index });
  });

  const { indexes, conflicts } = indexFusions(validEntries);
  const rejectedRecipes = [...rejected, ...conflicts].sort((left, right) => left.index - right.index);

  const table = buildFusionTable(indexes.byMaterialPair, indexes.byClassPair, indexes.byResult);

  const report: FusionReport = Object.freeze({
    totalInFile: parsedFile.data.length,
    validRecipes: indexes.byMaterialPair.size + indexes.byClassPair.size,
    rejectedRecipes: Object.freeze(rejectedRecipes),
    generatedAt: input.now(),
  });

  return ok({ table, report });
}
