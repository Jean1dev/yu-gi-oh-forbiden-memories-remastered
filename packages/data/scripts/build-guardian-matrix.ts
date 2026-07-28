import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createGuardianMatrix } from "../src/guardian-stars/create-matrix.ts";
import { getUsedGuardianStars } from "../src/guardian-stars/guardian-stars-used.ts";
import type { GuardianCoverageReport } from "../src/guardian-stars/types.ts";
import { validateMatrixCoverage } from "../src/guardian-stars/validate-coverage.ts";
import { loadCatalogFromDisk } from "./load-catalog-from-disk.ts";

/**
 * The Guardian Star matrix's only boundary with the filesystem. Everything
 * under `src/guardian-stars` is pure and receives already-read content
 * (TypeScript-development-guidelines.md §7.3, §19.2).
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");

const JSON_INDENTATION = 2;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

export type BuildGuardianMatrixOptions = Readonly<{
  /** The hand-authored source the data maintainer edits (spec F06, Decision 8). */
  sourcePath: string;
  /** Where F01/F02 wrote the artifacts `loadCatalogFromDisk` (F03) reads. */
  generatedCatalogDir: string;
  outputDir: string;
}>;

export const DEFAULT_OPTIONS: BuildGuardianMatrixOptions = {
  sourcePath: join(
    PACKAGE_ROOT,
    "src",
    "guardian-stars",
    "data",
    "guardian-star-matrix.source.json",
  ),
  generatedCatalogDir: join(PACKAGE_ROOT, "generated"),
  outputDir: join(PACKAGE_ROOT, "generated"),
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

function printSummary(report: GuardianCoverageReport): void {
  console.log(`Guardian Stars used:   ${String(report.usedGuardianStars.length)}`);
  console.log(`Pairs expected:        ${String(report.expectedPairs)}`);
  console.log(`Pairs covered:         ${String(report.coveredPairs)}`);
  console.log(`Pairs missing:         ${String(report.missingPairs.length)}`);

  for (const pair of report.missingPairs) {
    console.warn(`Missing pair: ${pair.atacante} -> ${pair.defensor}`);
  }

  console.log(
    report.complete
      ? "Guardian Star matrix coverage complete."
      : "Guardian Star matrix coverage incomplete: see the warnings above and guardian-star-coverage-report.json.",
  );
}

/**
 * Runs the Guardian Star matrix build end to end and returns the process exit
 * code.
 *
 * Only structural failures abort: a missing/unreadable source, a malformed or
 * duplicated entry, or an unavailable catalog. Incomplete coverage never does
 * — the exit code stays 0 even when the matrix is empty, because the values
 * are pending external data, not a defect of this build (spec F06,
 * Decision 7).
 */
export async function runBuildGuardianMatrix(
  options: BuildGuardianMatrixOptions = DEFAULT_OPTIONS,
): Promise<number> {
  const rawSource = await readJson(options.sourcePath);
  if (rawSource === null) {
    console.error(
      `Guardian Star matrix source not found or unreadable at ${relative(REPO_ROOT, options.sourcePath)} — build cancelled.`,
    );
    return EXIT_FAILURE;
  }

  const matrixResult = createGuardianMatrix(rawSource);
  if (!matrixResult.ok) {
    console.error(
      `Guardian Star matrix build aborted (${matrixResult.error.code}): ${matrixResult.error.message}`,
    );
    return EXIT_FAILURE;
  }

  const catalogResult = await loadCatalogFromDisk({
    generatedDir: options.generatedCatalogDir,
  });
  if (!catalogResult.ok) {
    console.error(
      `Catalog unavailable: cannot validate Guardian Star matrix coverage (${catalogResult.error.code}): ${catalogResult.error.message}`,
    );
    return EXIT_FAILURE;
  }

  const usedGuardianStars = getUsedGuardianStars(catalogResult.value);
  const coverageReport = validateMatrixCoverage(matrixResult.value, usedGuardianStars, () =>
    new Date().toISOString(),
  );

  try {
    await mkdir(options.outputDir, { recursive: true });
    await Promise.all([
      writeFile(
        join(options.outputDir, "guardian-star-matrix.json"),
        toJsonDocument(matrixResult.value.listEntries()),
        "utf8",
      ),
      writeFile(
        join(options.outputDir, "guardian-star-coverage-report.json"),
        toJsonDocument(coverageReport),
        "utf8",
      ),
    ]);
  } catch (error: unknown) {
    throw new Error(`failed to write Guardian Star matrix artifacts to ${options.outputDir}`, {
      cause: error,
    });
  }

  printSummary(coverageReport);
  return EXIT_SUCCESS;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runBuildGuardianMatrix();
}
