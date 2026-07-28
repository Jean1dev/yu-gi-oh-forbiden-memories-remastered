import type { CardCatalog } from "../catalog/types.ts";
import type { FusionRecipe, RejectedFusionRecipe } from "./types.ts";

export type FusionRecipeValidation =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; rejection: RejectedFusionRecipe }>;

/**
 * Confirms a schema-valid recipe against the catalog (F03): every `numero`
 * referenced — materials and result — must identify a real card, and every
 * `classe` referenced in a by-classes recipe must be one the catalog actually
 * holds (spec F05, Decision 7 — an extension beyond the PRD's literal
 * `numero`-only wording, applying F02's precedent for checking known
 * classes).
 */
export function validateFusionRecipe(
  recipe: FusionRecipe,
  index: number,
  catalog: CardCatalog,
): FusionRecipeValidation {
  if (recipe.kind === "materials") {
    for (const materialNumero of recipe.materials) {
      if (catalog.getByNumero(materialNumero) === undefined) {
        return {
          ok: false,
          rejection: {
            index,
            reason: "unknown_material_number",
            detail: `Recipe ${String(index)}: material '${materialNumero}' does not exist in the catalog.`,
          },
        };
      }
    }
  } else {
    for (const classe of recipe.classes) {
      if (catalog.listByClasse(classe).length === 0) {
        return {
          ok: false,
          rejection: {
            index,
            reason: "unknown_class",
            detail: `Recipe ${String(index)}: classe '${classe}' does not exist in the catalog.`,
          },
        };
      }
    }
  }

  if (catalog.getByNumero(recipe.result) === undefined) {
    return {
      ok: false,
      rejection: {
        index,
        reason: "unknown_result_number",
        detail: `Recipe ${String(index)}: result '${recipe.result}' does not exist in the catalog.`,
      },
    };
  }

  return { ok: true };
}
