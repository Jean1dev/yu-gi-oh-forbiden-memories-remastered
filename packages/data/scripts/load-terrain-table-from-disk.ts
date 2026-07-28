import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DomainError, err, type Result } from "@yugioh/shared";

import type { CardCatalog } from "../src/catalog/types.ts";
import { createTerrainTable } from "../src/terrain/create-terrain-table.ts";
import type { CreateTerrainTableOutput } from "../src/terrain/create-terrain-table.ts";
import { deriveKnownMonsterClasses } from "../src/terrain/derive-known-monster-classes.ts";

/**
 * The terrain↔class table's only boundary with the filesystem, same spirit
 * as `load-fusion-table-from-disk.ts`: it sits beside `src/terrain` rather
 * than inside it because everything under a package's `src/` is held to
 * being free of I/O (the `domain-cores-are-pure` boundary check).
 *
 * A `CardCatalog` is a required parameter, not an optional one the code
 * checks for at runtime — same guarantee `loadFusionTableFromDisk` relies on.
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");

export type LoadTerrainTableOptions = Readonly<{
  /** Where the maintainer hand-authors the terrain↔class matrix. */
  filePath: string;
  /** Already loaded by F03 — this feature never builds its own catalog. */
  catalog: CardCatalog;
}>;

export const DEFAULT_OPTIONS: Omit<LoadTerrainTableOptions, "catalog"> = {
  filePath: join(PACKAGE_ROOT, "src", "terrain", "data", "terrain-class-matrix.json"),
};

function missingFile(path: string): DomainError {
  return new DomainError(
    `Terrain class matrix not found or unreadable at ${relative(REPO_ROOT, path)}.`,
    "terrain_matrix_file_missing",
    { path },
  );
}

function malformedFile(path: string): DomainError {
  return new DomainError(
    `Terrain class matrix malformed — not valid JSON at ${relative(REPO_ROOT, path)}.`,
    "terrain_matrix_file_invalid",
    { path },
  );
}

/**
 * Reads `terrain-class-matrix.json`, derives the known monster classes from
 * the already-loaded catalog (F03), and delegates to the pure core.
 *
 * A missing or unreadable file fails before the core ever runs — a broken
 * precondition, not a verdict on any entry (spec F07 §6).
 */
export async function loadTerrainTableFromDisk(
  options: LoadTerrainTableOptions,
): Promise<Result<CreateTerrainTableOutput, DomainError>> {
  let content: string;
  try {
    content = await readFile(options.filePath, "utf8");
  } catch {
    return err(missingFile(options.filePath));
  }

  let matrizBruta: unknown;
  try {
    matrizBruta = JSON.parse(content);
  } catch {
    return err(malformedFile(options.filePath));
  }

  const classesConhecidas = deriveKnownMonsterClasses(options.catalog);

  return createTerrainTable({ matrizBruta, classesConhecidas });
}
