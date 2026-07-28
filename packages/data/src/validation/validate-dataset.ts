import type { DatasetSeal, ValidationReport, ValidationViolation } from "@yugioh/shared";

import type { ArtManifest } from "../ingestion/art-manifest.ts";
import { buildValidationReport, sealFromReport } from "./build-validation-report.ts";
import { checkArtCoverage } from "./check-art-coverage.ts";
import { checkCountAndContiguity } from "./check-count.ts";
import { checkKnownClass } from "./check-known-class.ts";
import { checkTypeCoherence } from "./check-type-coherence.ts";
import { checkUniqueness } from "./check-uniqueness.ts";
import { reparseCards } from "./reparse-cards.ts";

export type ValidationInput = Readonly<{
  /** `JSON.parse` of `cards.json`, still untrusted. */
  rawCards: unknown;
  manifest: ArtManifest;
  /** Decided by the adapter: this core never touches the filesystem. */
  placeholderExists: boolean;
  /** Injected so the orchestrator stays pure and reproducible. */
  generatedAt: string;
}>;

export type ValidationOutput = Readonly<{
  report: ValidationReport;
  seal: DatasetSeal;
}>;

/**
 * Runs the whole integrity gate over already-read artifacts and returns the
 * report and the seal.
 *
 * Nothing aborts here: every check runs and every violation is collected, so
 * one run tells the maintainer everything that is wrong instead of the first
 * thing that is wrong. The set-wide checks only see records that survived the
 * reparse, which keeps a malformed record from being counted as a card.
 *
 * `generatedAt` is the only non-deterministic value, and it is injected: the
 * same input always yields the same list of violations.
 */
export function validateDataset(input: ValidationInput): ValidationOutput {
  const reparsed = reparseCards(input.rawCards);
  const classes = checkKnownClass(reparsed.cards);

  const violations: readonly ValidationViolation[] = [
    ...reparsed.violations,
    ...checkCountAndContiguity(reparsed.cards),
    ...checkUniqueness(reparsed.cards),
    ...classes.violations,
    ...checkTypeCoherence(reparsed.cards),
    ...checkArtCoverage(reparsed.cards, input.manifest, input.placeholderExists),
  ];

  const report = buildValidationReport({
    totalValidated: reparsed.cards.length,
    violations,
    unknownClasses: classes.unknownClasses,
    generatedAt: input.generatedAt,
  });

  return { report, seal: sealFromReport(report) };
}
