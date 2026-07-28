export { buildTerrainIndex } from "./build-terrain-index.ts";
export { calculateClassCoverage } from "./calculate-class-coverage.ts";
export { createTerrainTable } from "./create-terrain-table.ts";
export type { CreateTerrainTableInput, CreateTerrainTableOutput } from "./create-terrain-table.ts";
export { deriveKnownMonsterClasses } from "./derive-known-monster-classes.ts";
export { detectContradictoryClass } from "./detect-contradictory-class.ts";
export { detectDuplicateTerrain } from "./detect-duplicate-terrain.ts";
export {
  TerrainClassMatrixSourceSchema,
  TerrainClassRuleSchema,
} from "./schema.ts";
export {
  TERRAIN_VIOLATION_CATEGORIES,
  type TerrainClassCoverageReport,
  type TerrainClassRule,
  type TerrainClassTable,
  type TerrainClassViolation,
  type TerrainClassification,
  type TerrainViolationCategory,
} from "./types.ts";
export { validateClassReferences } from "./validate-class-references.ts";
export { validateMatrixStructure } from "./validate-matrix-structure.ts";
export type { MatrixStructureResult } from "./validate-matrix-structure.ts";
