import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DomainError, err, type Result } from "@yugioh/shared";

import type { CardCatalog } from "../src/catalog/types.ts";
import { createDropTable } from "../src/drops/create-drop-table.ts";
import type { DropTable } from "../src/drops/types.ts";

/**
 * The drop table's only boundary with the filesystem, same spirit as
 * `load-terrain-table-from-disk.ts` and `load-fusion-table-from-disk.ts`: it
 * sits beside `src/drops` rather than inside it because everything under a
 * package's `src/` is held to being free of I/O (the `domain-cores-are-pure`
 * boundary check).
 *
 * A `CardCatalog` is a required parameter, not an optional one the code
 * checks for at runtime — same guarantee the sibling loaders rely on.
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");

export type LoadDropTableOptions = Readonly<{
  /** Where the maintainer hand-authors the drop-table source. */
  filePath: string;
  /** Already loaded by F03 — this feature never builds its own catalog. */
  catalog: CardCatalog;
}>;

export const DEFAULT_OPTIONS: Omit<LoadDropTableOptions, "catalog"> = {
  filePath: join(PACKAGE_ROOT, "src", "drops", "data", "drop-tables.json"),
};

function isFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function unreadableFile(path: string, cause: unknown): DomainError {
  return new DomainError(
    `Falha ao carregar a tabela de drops de ${relative(REPO_ROOT, path)}.`,
    "drop_table_file_unreadable",
    { path, cause: cause instanceof Error ? cause.message : String(cause) },
  );
}

function malformedFile(path: string): DomainError {
  return new DomainError(
    `Tabela de drops ilegivel em ${relative(REPO_ROOT, path)} — verifique o formato JSON.`,
    "arquivo_drops_ilegivel",
    { path },
  );
}

/**
 * Reads `drop-tables.json` and delegates to the pure core.
 *
 * A missing file is *not* an error here (spec F08, Decision 3/7): the
 * maintainer has not provided the pending drop values yet, so this resolves
 * to the same neutral empty table `createDropTable` produces for `[]` —
 * unlike the terrain/fusion/catalog loaders, where a missing artifact is a
 * broken precondition. Only a file that exists but cannot be read or parsed
 * fails.
 */
export async function loadDropTableFromDisk(
  options: LoadDropTableOptions,
): Promise<Result<DropTable, DomainError>> {
  let content: string;
  try {
    content = await readFile(options.filePath, "utf8");
  } catch (cause) {
    if (isFileNotFound(cause)) {
      return createDropTable({ poolsBruto: [], catalogo: options.catalog });
    }
    return err(unreadableFile(options.filePath, cause));
  }

  let poolsBruto: unknown;
  try {
    poolsBruto = JSON.parse(content);
  } catch {
    return err(malformedFile(options.filePath));
  }

  return createDropTable({ poolsBruto, catalogo: options.catalog });
}
