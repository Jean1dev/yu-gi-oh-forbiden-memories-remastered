import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DomainError, err, ok, type CardNumber, type Result } from "@yugioh/shared";

/**
 * The original game's data, as a single SQLite file.
 *
 * The upstream source is `sg4e/YGOFM-gamedata`, a datamine verified against
 * emulator memory dumps. Node 24 reads it with the built-in `node:sqlite`, so
 * this adds no dependency. The file is cached under `.cache/` (gitignored)
 * because extraction is a rare, manual step and re-downloading 868 KB per run
 * would be rude to a volunteer project.
 *
 * Shared by every `extract-fm-*` script: the duelist pools
 * (`extract-fm-duelist.ts`) and the equip compatibility table
 * (`extract-fm-equip-compatibility.ts`) come out of the same file.
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(PACKAGE_ROOT, ".cache");
const DATABASE_FILE = join(CACHE_DIR, "fm-sqlite3.db");
const DATABASE_URL =
  "https://raw.githubusercontent.com/sg4e/YGOFM-gamedata/master/sqlite/fm-sqlite3.db";

/**
 * The cached database path, downloading it first if this machine has never
 * fetched it. The cache is never invalidated on purpose — the upstream data is
 * a datamine of a released 1999 game, so it does not change.
 */
export async function ensureDatabase(): Promise<Result<string, DomainError>> {
  try {
    await readFile(DATABASE_FILE);
    return ok(DATABASE_FILE);
  } catch {
    // Not cached yet — fall through to the download.
  }

  try {
    const response = await fetch(DATABASE_URL);
    if (!response.ok) {
      return err(
        new DomainError(
          "Could not download the Forbidden Memories database.",
          "source_unavailable",
          {
            status: response.status,
          },
        ),
      );
    }
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(DATABASE_FILE, Buffer.from(await response.arrayBuffer()));
    return ok(DATABASE_FILE);
  } catch (error) {
    return err(
      new DomainError("Could not download the Forbidden Memories database.", "source_unavailable", {
        error: String(error),
      }),
    );
  }
}

/**
 * The source's `CardId` as this project's `numero`. The two identifier spaces
 * are the same 1..722 range; only the zero padding differs.
 */
export function toCardNumber(cardId: number): CardNumber {
  return String(cardId).padStart(3, "0");
}
