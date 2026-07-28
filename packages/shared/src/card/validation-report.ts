import { z } from "zod";

import { CardNumberSchema } from "./schema.ts";

/**
 * Verdict contracts of the integrity gate (banco-de-cartas/F02).
 *
 * Two artifacts, on purpose: the report carries every violation and is read by
 * the data maintainer; the seal is minimal and is what F03 checks before it
 * agrees to serve the dataset (spec F02, Decision 9).
 *
 * The category values stay in Portuguese because they name the canonical card
 * fields (`tipo`, `classe`, `password`) and are the buckets the PRD Experience
 * lists verbatim.
 */

/** The seven buckets a violation can fall into. */
export const VIOLATION_CATEGORIES = [
  "contagem",
  "unicidade",
  "tipo",
  "classe",
  "coerencia",
  "password",
  "arte",
] as const;

export const ViolationCategorySchema = z.enum(VIOLATION_CATEGORIES);

export type ViolationCategory = (typeof VIOLATION_CATEGORIES)[number];

/**
 * A single rule broken by the dataset.
 *
 * `code` is the stable identifier tests and tooling assert on; `message` is for
 * humans and may be reworded without breaking anything
 * (TypeScript-development-guidelines.md §8.1).
 */
export const ValidationViolationSchema = z.strictObject({
  category: ViolationCategorySchema,
  /** Absent only for set-wide violations, such as a wrong total. */
  numero: CardNumberSchema.optional(),
  code: z.string().min(1),
  message: z.string().min(1),
});

export type ValidationViolation = z.infer<typeof ValidationViolationSchema>;

const violationsByCategory = z.strictObject(
  Object.fromEntries(
    VIOLATION_CATEGORIES.map((category) => [category, z.number().int().min(0)]),
  ) as Record<ViolationCategory, z.ZodNumber>,
);

/** Process evidence: every violation found, plus the explicit verdict. */
export const ValidationReportSchema = z.strictObject({
  /** Cards that survived the reparse and reached the set-wide checks. */
  totalValidated: z.number().int().min(0),
  violations: z.array(ValidationViolationSchema),
  /** Always carries all seven keys, `0` included, so a reader never guesses. */
  violationsByCategory,
  /** Classes found outside `KNOWN_CLASSES`, sorted and deduplicated. */
  unknownClasses: z.array(z.string()),
  valid: z.boolean(),
  /** ISO 8601. The only non-deterministic field (spec F02, Decision 7). */
  generatedAt: z.string().min(1),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;

/**
 * The seal F03 parses before loading the catalog. Deliberately minimal: F03
 * decides whether to boot without having to understand the whole report.
 */
export const DatasetSealSchema = z.strictObject({
  valid: z.boolean(),
  generatedAt: z.string().min(1),
});

export type DatasetSeal = z.infer<typeof DatasetSealSchema>;
