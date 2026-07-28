import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DomainError, err, type Result } from "@yugioh/shared";

import type { CardCatalog } from "../src/catalog/types.ts";
import { createFusionTable } from "../src/fusion/create-fusion-table.ts";
import type { CreateFusionTableOutput } from "../src/fusion/create-fusion-table.ts";

/**
 * The fusion table's only boundary with the filesystem, same spirit as
 * `load-catalog-from-disk.ts`: it sits beside `src/fusion` rather than inside
 * it because everything under a package's `src/` is held to being free of
 * I/O (the `domain-cores-are-pure` boundary check).
 *
 * A `CardCatalog` is a required parameter, not an optional one the code
 * checks for at runtime: TypeScript's strict mode already refuses to compile
 * a call site that omits it, which is the same guarantee `createCatalog`
 * relies on for its own required inputs.
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");

const JSON_INDENTATION = 2;
const REPORT_FILE = "fusion-validation-report.json";

export type LoadFusionTableOptions = Readonly<{
  /** Where the maintainer hand-authors the fusion recipes. */
  filePath: string;
  /** Already loaded by F03 — this feature never builds its own catalog. */
  catalog: CardCatalog;
  /** Where the validation report is written on success. */
  reportDir: string;
}>;

export const DEFAULT_OPTIONS: Omit<LoadFusionTableOptions, "catalog"> = {
  filePath: join(PACKAGE_ROOT, "rules-data", "fusions.json"),
  reportDir: join(PACKAGE_ROOT, "generated"),
};

function missingFile(path: string): DomainError {
  return new DomainError(
    `Fusion file not found or unreadable at ${relative(REPO_ROOT, path)}.`,
    "fusion_file_missing",
    { path },
  );
}

function malformedFile(path: string): DomainError {
  return new DomainError(
    `Fusion file malformed — not valid JSON at ${relative(REPO_ROOT, path)}.`,
    "fusion_file_invalid",
    { path },
  );
}

/**
 * Reads `fusions.json`, delegates to the pure core, and writes the validation
 * report on success.
 *
 * A missing or unreadable file fails before the core ever runs — a broken
 * precondition, not a verdict on any recipe — and a top-level parse failure
 * gets the same `fusion_file_invalid` code the core itself returns for a
 * parsed-but-not-an-array payload, since both mean "there is no recipe list
 * to read here" (spec F05 §6).
 */
export async function loadFusionTableFromDisk(
  options: LoadFusionTableOptions,
): Promise<Result<CreateFusionTableOutput, DomainError>> {
  let content: string;
  try {
    content = await readFile(options.filePath, "utf8");
  } catch {
    return err(missingFile(options.filePath));
  }

  let rawRecipes: unknown;
  try {
    rawRecipes = JSON.parse(content);
  } catch {
    return err(malformedFile(options.filePath));
  }

  const created = createFusionTable({
    rawRecipes,
    catalog: options.catalog,
    now: () => new Date().toISOString(),
  });
  if (!created.ok) {
    return created;
  }

  try {
    await mkdir(options.reportDir, { recursive: true });
    await writeFile(
      join(options.reportDir, REPORT_FILE),
      `${JSON.stringify(created.value.report, null, JSON_INDENTATION)}\n`,
      "utf8",
    );
  } catch (error: unknown) {
    throw new Error(`failed to write fusion validation report to ${options.reportDir}`, {
      cause: error,
    });
  }

  return created;
}
