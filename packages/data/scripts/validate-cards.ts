import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_ART_PLACEHOLDER_PATH,
  VIOLATION_CATEGORIES,
  type ValidationReport,
} from "@yugioh/shared";

import { ArtManifestSchema, type ArtManifest } from "../src/ingestion/art-manifest.ts";
import { validateDataset } from "../src/validation/validate-dataset.ts";

/**
 * The integrity gate's only boundary with the filesystem. Everything below
 * `src/validation` is pure and receives already-read content
 * (TypeScript-development-guidelines.md §7.3, §19.2).
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");

const JSON_INDENTATION = 2;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

export type ValidationOptions = Readonly<{
  /** Where F01 wrote `cards.json` and `arts-manifest.json`. */
  generatedDir: string;
  /** Absolute path of the fallback art, still a pending asset today. */
  placeholderPath: string;
}>;

export const DEFAULT_OPTIONS: ValidationOptions = {
  generatedDir: join(PACKAGE_ROOT, "generated"),
  placeholderPath: join(REPO_ROOT, DEFAULT_ART_PLACEHOLDER_PATH),
};

function toJsonDocument(value: unknown): string {
  return `${JSON.stringify(value, null, JSON_INDENTATION)}\n`;
}

async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function printSummary(report: ValidationReport): void {
  console.log(`Cards validated:       ${String(report.totalValidated)}`);
  for (const category of VIOLATION_CATEGORIES) {
    console.log(
      `Violations (${category.padEnd(9)}): ${String(report.violationsByCategory[category])}`,
    );
  }

  // The PRD asks for every offending card/field, not just the totals: an
  // invalid dataset is only actionable if the report says what to fix.
  for (const violation of report.violations) {
    console.warn(`${violation.code}: ${violation.message}`);
  }
  for (const classe of report.unknownClasses) {
    console.warn(`Unknown classe observed: ${classe}`);
  }

  console.log(
    report.valid
      ? "Dataset valid: sealed for distribution."
      : "Dataset invalid: not sealed — see the violations above and validation-report.json.",
  );
}

/**
 * Validates the artifacts F01 emitted and returns the process exit code.
 *
 * Missing or unreadable inputs abort before any check runs and write nothing:
 * that is a failed precondition, not a verdict, and emitting a seal in that
 * state would be the one outcome worse than no seal at all (spec F02 §6).
 */
export async function runValidation(options: ValidationOptions = DEFAULT_OPTIONS): Promise<number> {
  const cardsPath = join(options.generatedDir, "cards.json");
  const manifestPath = join(options.generatedDir, "arts-manifest.json");
  const cropManifestPath = join(options.generatedDir, "crop-arts-manifest.json");

  const rawCards = await readJson(cardsPath);
  if (rawCards === null) {
    console.error(
      `Card catalog not found or unreadable at ${relative(REPO_ROOT, cardsPath)} — validation cancelled.`,
    );
    return EXIT_FAILURE;
  }

  const rawManifest = await readJson(manifestPath);
  const parsedManifest = ArtManifestSchema.safeParse(rawManifest);
  if (!parsedManifest.success) {
    console.error(
      `Art manifest not found or unreadable at ${relative(REPO_ROOT, manifestPath)} — validation cancelled.`,
    );
    return EXIT_FAILURE;
  }
  const manifest: ArtManifest = parsedManifest.data;
  const parsedCropManifest = ArtManifestSchema.safeParse(await readJson(cropManifestPath));
  const cropManifest: ArtManifest = parsedCropManifest.success ? parsedCropManifest.data : {};

  const placeholderExists = await fileExists(options.placeholderPath);

  const { report, seal } = validateDataset({
    rawCards,
    manifest,
    cropManifest,
    placeholderExists,
    generatedAt: new Date().toISOString(),
  });

  try {
    await mkdir(options.generatedDir, { recursive: true });
    await Promise.all([
      writeFile(
        join(options.generatedDir, "validation-report.json"),
        toJsonDocument(report),
        "utf8",
      ),
      writeFile(join(options.generatedDir, "dataset-seal.json"), toJsonDocument(seal), "utf8"),
    ]);
  } catch (error: unknown) {
    throw new Error(`failed to write validation artifacts to ${options.generatedDir}`, {
      cause: error,
    });
  }

  printSummary(report);
  return seal.valid ? EXIT_SUCCESS : EXIT_FAILURE;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runValidation();
}
