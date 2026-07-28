import type { TerrainClassCoverageReport, TerrainClassRule } from "./types.ts";

/**
 * Reports which known monster classes are cited by at least one entry
 * (strengthened or weakened, in any terreno) and which are not.
 *
 * Never blocks: an empty or partial matrix still produces a full report
 * (spec F07, Decision 6) — `classesWithoutCoverage` lists every known class
 * while the matrix embarks empty, which is the expected state today.
 */
export function calculateClassCoverage(
  entries: readonly TerrainClassRule[],
  classesConhecidas: readonly string[],
): TerrainClassCoverageReport {
  const covered = new Set<string>();
  for (const entry of entries) {
    for (const classe of [...entry.classesFortalecidas, ...entry.classesEnfraquecidas]) {
      covered.add(classe);
    }
  }

  const classesWithoutCoverage = classesConhecidas.filter((classe) => !covered.has(classe)).sort();

  return Object.freeze({
    totalKnownClasses: classesConhecidas.length,
    totalCoveredClasses: classesConhecidas.length - classesWithoutCoverage.length,
    classesWithoutCoverage: Object.freeze(classesWithoutCoverage),
  });
}
