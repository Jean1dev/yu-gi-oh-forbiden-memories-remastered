export { createGuardianMatrix } from "./create-matrix.ts";
export { getUsedGuardianStars } from "./guardian-stars-used.ts";
export { normalizeMatrixEntry } from "./normalize-entry.ts";
export {
  GuardianCompatibilityResultSchema,
  GuardianMatrixEntrySchema,
  GuardianMatrixSourceSchema,
} from "./schema.ts";
export {
  GUARDIAN_COMPATIBILITY_RESULTS,
  type GuardianCompatibilityResult,
  type GuardianCoverageReport,
  type GuardianMatrix,
  type GuardianMatrixEntry,
  type MissingGuardianPair,
} from "./types.ts";
export { validateMatrixCoverage } from "./validate-coverage.ts";
