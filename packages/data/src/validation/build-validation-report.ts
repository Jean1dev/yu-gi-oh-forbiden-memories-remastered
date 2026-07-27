import {
  VIOLATION_CATEGORIES,
  type DatasetSeal,
  type ValidationReport,
  type ValidationViolation,
  type ViolationCategory,
} from "@yugioh/shared";

export type ValidationReportInput = Readonly<{
  /** Cards that survived the reparse, not records read. */
  totalValidated: number;
  violations: readonly ValidationViolation[];
  unknownClasses: readonly string[];
  /** Injected so the assembly stays pure and reproducible in tests. */
  generatedAt: string;
}>;

/** Counts every category, so an untouched one reads as `0` instead of missing. */
function countByCategory(
  violations: readonly ValidationViolation[],
): Record<ViolationCategory, number> {
  const counts = Object.fromEntries(
    VIOLATION_CATEGORIES.map((category) => [category, 0]),
  ) as Record<ViolationCategory, number>;
  for (const violation of violations) {
    counts[violation.category] += 1;
  }
  return counts;
}

/**
 * Assembles the integrity report.
 *
 * The verdict is deliberately unforgiving: any violation at all, in any
 * category, makes the dataset invalid. There is no "warning" tier — a dataset
 * that fails a rule is not served (ADR-003, fail-safe).
 */
export function buildValidationReport(input: ValidationReportInput): ValidationReport {
  return {
    totalValidated: input.totalValidated,
    violations: [...input.violations],
    violationsByCategory: countByCategory(input.violations),
    unknownClasses: [...input.unknownClasses],
    valid: input.violations.length === 0,
    generatedAt: input.generatedAt,
  };
}

/**
 * Derives the seal F03 reads.
 *
 * It carries the verdict and nothing else on purpose: F03 must be able to
 * refuse to boot without parsing, or understanding, the full report
 * (spec F02, Decision 9).
 */
export function sealFromReport(report: ValidationReport): DatasetSeal {
  return { valid: report.valid, generatedAt: report.generatedAt };
}
