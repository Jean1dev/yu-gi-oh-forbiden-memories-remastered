import type { GuardianStar } from "@yugioh/shared";

import type { GuardianCoverageReport, GuardianMatrix, MissingGuardianPair } from "./types.ts";

/**
 * Reports which ordered pairs among `usedGuardianStars` have their own entry
 * in the matrix, and which do not.
 *
 * Coverage is checked against the matrix's *registered* entries, never
 * through `queryCompatibility` — that method's neutral fallback would make a
 * genuinely missing pair indistinguishable from one the maintainer explicitly
 * marked neutral (spec F06, §3 step 8).
 *
 * Never blocks: an empty or partial matrix still produces a full report
 * (spec F06, Decision 7).
 */
export function validateMatrixCoverage(
  matrix: GuardianMatrix,
  usedGuardianStars: readonly GuardianStar[],
  now: () => string,
): GuardianCoverageReport {
  const registeredPairs = new Set(
    matrix.listEntries().map((entry) => `${entry.atacante}:${entry.defensor}`),
  );

  const missingPairs: MissingGuardianPair[] = [];
  for (const atacante of usedGuardianStars) {
    for (const defensor of usedGuardianStars) {
      if (!registeredPairs.has(`${atacante}:${defensor}`)) {
        missingPairs.push({ atacante, defensor });
      }
    }
  }

  const expectedPairs = usedGuardianStars.length ** 2;

  return Object.freeze({
    usedGuardianStars: Object.freeze([...usedGuardianStars]),
    expectedPairs,
    coveredPairs: expectedPairs - missingPairs.length,
    missingPairs: Object.freeze(missingPairs),
    complete: missingPairs.length === 0,
    generatedAt: now(),
  });
}
