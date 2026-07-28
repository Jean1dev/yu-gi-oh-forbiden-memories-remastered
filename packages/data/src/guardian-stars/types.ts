import type { GuardianStar } from "@yugioh/shared";

/**
 * The three-way verdict of one Guardian Star's edge over another in the
 * classic table (product.md lines 40-46). The values stay in Portuguese
 * because they are the PRD's own vocabulary for the mechanic, the same
 * precedent as `ValidationViolation.category` (banco-de-cartas/F02).
 */
export const GUARDIAN_COMPATIBILITY_RESULTS = ["vantagem", "desvantagem", "neutro"] as const;

export type GuardianCompatibilityResult = (typeof GUARDIAN_COMPATIBILITY_RESULTS)[number];

/**
 * One directed pair of the matrix: how `atacante` fares against `defensor`.
 * Field names stay in Portuguese because this is the hand-authored source
 * dataset format the data maintainer edits directly (spec F06, Decision 8),
 * the same rule that keeps `Card`'s fields in Portuguese.
 */
export type GuardianMatrixEntry = Readonly<{
  atacante: GuardianStar;
  defensor: GuardianStar;
  resultado: GuardianCompatibilityResult;
  /** Integer >= 0. `0` iff `resultado === "neutro"` (spec F06, Decision 4). */
  bonusAtaque: number;
}>;

/**
 * The read-only, indexed matrix — mirrors `CardCatalog`'s shape (F03): every
 * method answers from state built once at construction.
 */
export type GuardianMatrix = Readonly<{
  /**
   * Total: never throws. Returns the registered entry, or the synthetic
   * neutral fallback `{ atacante, defensor, resultado: "neutro", bonusAtaque: 0 }`
   * when the pair has none (spec F06, Decision 11).
   */
  queryCompatibility(atacante: GuardianStar, defensor: GuardianStar): GuardianMatrixEntry;
  listEntries(): readonly GuardianMatrixEntry[];
  size(): number;
}>;

export type MissingGuardianPair = Readonly<{ atacante: GuardianStar; defensor: GuardianStar }>;

/**
 * Coverage evidence for the data maintainer — same spirit as F02's
 * `ValidationReport`, but informational only: incompleteness never blocks the
 * build (spec F06, Decision 7).
 */
export type GuardianCoverageReport = Readonly<{
  /** Guardian Stars actually used by the catalog, in `GUARDIAN_STARS` order. */
  usedGuardianStars: readonly GuardianStar[];
  /** `usedGuardianStars.length ** 2` — never a hard-coded 100 (spec F06, Decision 6). */
  expectedPairs: number;
  coveredPairs: number;
  missingPairs: readonly MissingGuardianPair[];
  complete: boolean;
  /** ISO 8601. The only non-deterministic field (spec F06, Decision 9). */
  generatedAt: string;
}>;
