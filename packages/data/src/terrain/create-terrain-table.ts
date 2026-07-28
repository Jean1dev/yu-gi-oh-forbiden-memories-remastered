import { DomainError, err, ok, type Result } from "@yugioh/shared";

import { buildTerrainIndex } from "./build-terrain-index.ts";
import { calculateClassCoverage } from "./calculate-class-coverage.ts";
import { detectContradictoryClass } from "./detect-contradictory-class.ts";
import { detectDuplicateTerrain } from "./detect-duplicate-terrain.ts";
import { validateClassReferences } from "./validate-class-references.ts";
import { validateMatrixStructure } from "./validate-matrix-structure.ts";
import type {
  TerrainClassCoverageReport,
  TerrainClassTable,
  TerrainClassViolation,
  TerrainClassification,
} from "./types.ts";

export type CreateTerrainTableInput = Readonly<{
  /** `JSON.parse` of `terrain-class-matrix.json`, still untrusted. */
  matrizBruta: unknown;
  /** Monster classes derived from the real catalog (F03) via `deriveKnownMonsterClasses`. */
  classesConhecidas: readonly string[];
}>;

export type CreateTerrainTableOutput = Readonly<{
  table: TerrainClassTable;
  coverageReport: TerrainClassCoverageReport;
}>;

const NEUTRAL_CLASSIFICATION: TerrainClassification = Object.freeze({
  tipo: "neutra",
  magnitude: 0,
});

/**
 * Runs the whole terrain↔class pipeline over an already-read raw array and
 * the known monster classes: structure, duplicate terreno, contradictory
 * classe and unknown classe reference, in that order (spec F07, §3 steps
 * 3-6).
 *
 * All-or-nothing (spec F07, Decision 6): every violation from every step is
 * accumulated before deciding, and a single one blocks the whole table —
 * there is no "partially valid table" the way F01/F02 tolerate partial
 * datasets, because this data is hand-authored by the maintainer, not
 * machine-ingested from an uncontrolled source (same reasoning as F06's
 * `createGuardianMatrix`).
 *
 * An empty `matrizBruta` array is success, not an error: it is the expected
 * state while the real terrain values remain a pending external dataset
 * (spec F07, Decision 9). Every query on the resulting table then answers
 * `"neutra"` rather than failing.
 */
export function createTerrainTable(
  input: CreateTerrainTableInput,
): Result<CreateTerrainTableOutput, DomainError> {
  const structure = validateMatrixStructure(input.matrizBruta);

  const violations: readonly TerrainClassViolation[] = [
    ...structure.violations,
    ...detectDuplicateTerrain(structure.entries),
    ...detectContradictoryClass(structure.entries),
    ...validateClassReferences(structure.entries, input.classesConhecidas),
  ];

  if (violations.length > 0) {
    return err(
      new DomainError("Terrain class matrix is invalid.", "terrain_matrix_invalid", {
        violations,
      }),
    );
  }

  const coverageReport = calculateClassCoverage(structure.entries, input.classesConhecidas);
  const index = buildTerrainIndex(structure.entries);
  const terrenos: readonly string[] = Object.freeze([...index.keys()].sort());

  const table: TerrainClassTable = {
    listTerrenos() {
      return terrenos;
    },
    getRuleByTerreno(terreno) {
      return index.get(terreno);
    },
    classifyClasseInTerreno(terreno, classe) {
      const rule = index.get(terreno);
      if (rule === undefined) {
        return NEUTRAL_CLASSIFICATION;
      }
      if (rule.classesFortalecidas.includes(classe)) {
        return Object.freeze({
          tipo: "fortalecida" as const,
          magnitude: rule.magnitudeFortalecimento,
        });
      }
      if (rule.classesEnfraquecidas.includes(classe)) {
        return Object.freeze({
          tipo: "enfraquecida" as const,
          magnitude: rule.magnitudeEnfraquecimento,
        });
      }
      return NEUTRAL_CLASSIFICATION;
    },
    coverageReport() {
      return coverageReport;
    },
  };

  return ok({ table: Object.freeze(table), coverageReport });
}
