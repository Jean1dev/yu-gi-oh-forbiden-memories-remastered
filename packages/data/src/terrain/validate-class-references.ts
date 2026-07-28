import type { TerrainClassRule, TerrainClassViolation } from "./types.ts";

/**
 * Flags any class referenced in `classesFortalecidas`/`classesEnfraquecidas`
 * that is not one of `classesConhecidas` — a typo or stale reference, hard
 * blocking (spec F07, Decision 6), unlike `calculateClassCoverage`'s
 * non-blocking report of classes the matrix has not gotten to yet.
 */
export function validateClassReferences(
  entries: readonly TerrainClassRule[],
  classesConhecidas: readonly string[],
): readonly TerrainClassViolation[] {
  const known = new Set(classesConhecidas);
  const violations: TerrainClassViolation[] = [];

  for (const entry of entries) {
    for (const classe of [...entry.classesFortalecidas, ...entry.classesEnfraquecidas]) {
      if (!known.has(classe)) {
        violations.push({
          category: "classe_desconhecida",
          terreno: entry.terreno,
          classe,
          code: "unknown_classe_reference",
          message: `Classe '${classe}' referenced in terreno '${entry.terreno}' does not exist in the catalog.`,
        });
      }
    }
  }

  return violations;
}
