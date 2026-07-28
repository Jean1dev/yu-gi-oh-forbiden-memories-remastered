import type { TerrainClassRule, TerrainClassViolation } from "./types.ts";

/**
 * Flags a class that appears in both `classesFortalecidas` and
 * `classesEnfraquecidas` of the same entry — a logically incoherent rule
 * neither the PRD nor the architecture resolves, so the safest default is to
 * block it (spec F07, Decision 5).
 */
export function detectContradictoryClass(
  entries: readonly TerrainClassRule[],
): readonly TerrainClassViolation[] {
  const violations: TerrainClassViolation[] = [];

  for (const entry of entries) {
    const strengthened = new Set(entry.classesFortalecidas);
    for (const classe of entry.classesEnfraquecidas) {
      if (strengthened.has(classe)) {
        violations.push({
          category: "classe_contraditoria",
          terreno: entry.terreno,
          classe,
          code: "contradictory_classe",
          message: `Classe '${classe}' is both strengthened and weakened in terreno '${entry.terreno}'.`,
        });
      }
    }
  }

  return violations;
}
