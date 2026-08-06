import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { DomainError, err, ok, type CardNumber, type Result } from "@yugioh/shared";

import {
  DuelistSourceSchema,
  type DuelistDropPoolSource,
  type DuelistPoolEntry,
  type DuelistSource,
} from "../src/roster/duelist-source.ts";

/**
 * Pulls one duelist's weighted pools out of the original game's data and
 * writes `data/duelists/<id>.json`.
 *
 * The upstream source is `sg4e/YGOFM-gamedata`, a datamine verified against
 * emulator memory dumps, distributed as a single SQLite file. Node 24 reads it
 * with the built-in `node:sqlite`, so this adds no dependency. The database is
 * cached under `.cache/` (gitignored) — extraction is a rare, manual step, and
 * re-downloading 868 KB per duelist would be rude to a volunteer project.
 *
 * Only the pools are extracted. `difficulty`, `portrait`, `profile` and
 * `deckSeed` are balancing decisions this project makes, so a re-extraction
 * preserves whatever the existing file already declares.
 *
 * Usage:
 *   node scripts/extract-fm-duelist.ts --name="Teana" --id=teana
 *   node scripts/extract-fm-duelist.ts --fm-id=3 --id=jono --difficulty=easy
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(PACKAGE_ROOT, ".cache");
const DATABASE_FILE = join(CACHE_DIR, "fm-sqlite3.db");
const DUELISTS_DIR = join(PACKAGE_ROOT, "data", "duelists");
const DATABASE_URL =
  "https://raw.githubusercontent.com/sg4e/YGOFM-gamedata/master/sqlite/fm-sqlite3.db";

/** The original game's pool types, mapped to the drop tiers the roster speaks. */
const DROP_POOL_TIERS: ReadonlyArray<readonly [poolType: string, tier: string]> = [
  // BCD is the pool the current rating policy always asks for, so it is the
  // one that has to answer to the `common` tier (`lib/free-duel/rating-policy.ts`).
  ["BCD", "common"],
  ["SAPow", "sa-pow"],
  ["SATec", "sa-tec"],
];

const DECK_POOL_TYPE = "Deck";
const DEFAULT_DECK_SEED = 20260805;

type DuelistRow = Readonly<{ DuelistId: number; Duelist: string; HandSize: number }>;

function toCardNumber(cardId: number): CardNumber {
  return String(cardId).padStart(3, "0");
}

async function ensureDatabase(): Promise<Result<string, DomainError>> {
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

function findDuelist(
  database: DatabaseSync,
  selector: Readonly<{ name?: string | undefined; fmId?: number | undefined }>,
): Result<DuelistRow, DomainError> {
  const row =
    selector.fmId === undefined
      ? (database
          .prepare("select DuelistId, Duelist, HandSize from duelistinfo where Duelist = ?")
          .get(selector.name ?? "") as DuelistRow | undefined)
      : (database
          .prepare("select DuelistId, Duelist, HandSize from duelistinfo where DuelistId = ?")
          .get(selector.fmId) as DuelistRow | undefined);

  if (row === undefined) {
    const known = database
      .prepare("select Duelist from duelistinfo order by DuelistId")
      .all()
      .map((entry) => String(entry.Duelist));
    return err(
      new DomainError("No such duelist in the source database.", "unknown_source_duelist", {
        selector,
        known,
      }),
    );
  }
  return ok(row);
}

function readPool(
  database: DatabaseSync,
  fmDuelistId: number,
  poolType: string,
): readonly DuelistPoolEntry[] {
  const rows = database
    .prepare(
      "select CardId, CardProbability from droppool where Duelist = ? and PoolType = ? order by CardId",
    )
    .all(fmDuelistId, poolType) as readonly Record<string, unknown>[];
  return rows.map((row) => ({
    cardNumber: toCardNumber(Number(row.CardId)),
    weight: Number(row.CardProbability),
  }));
}

async function readExistingSource(path: string): Promise<Partial<DuelistSource>> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Partial<DuelistSource>;
  } catch {
    return {};
  }
}

export type ExtractOptions = Readonly<{
  id: string;
  name?: string | undefined;
  fmId?: number | undefined;
  difficulty?: string | undefined;
}>;

export async function extractDuelist(
  options: ExtractOptions,
): Promise<Result<DuelistSource, DomainError>> {
  const databasePath = await ensureDatabase();
  if (!databasePath.ok) {
    return databasePath;
  }

  const database = new DatabaseSync(databasePath.value, { readOnly: true });
  try {
    const duelist = findDuelist(database, { name: options.name, fmId: options.fmId });
    if (!duelist.ok) {
      return duelist;
    }

    const deckPool = readPool(database, duelist.value.DuelistId, DECK_POOL_TYPE);
    if (deckPool.length === 0) {
      return err(
        new DomainError("The duelist has no deck pool in the source database.", "empty_deck_pool", {
          duelist: duelist.value.Duelist,
        }),
      );
    }

    const dropPools: DuelistDropPoolSource[] = [];
    for (const [poolType, tier] of DROP_POOL_TIERS) {
      const entries = readPool(database, duelist.value.DuelistId, poolType);
      if (entries.length > 0) {
        dropPools.push({ tier, entries });
      }
    }

    const path = join(DUELISTS_DIR, `${options.id}.json`);
    const existing = await readExistingSource(path);
    const parsed = DuelistSourceSchema.safeParse({
      id: options.id,
      name: existing.name ?? duelist.value.Duelist,
      fmDuelistId: duelist.value.DuelistId,
      handSize: duelist.value.HandSize,
      difficulty: options.difficulty ?? existing.difficulty ?? "easy",
      portrait: existing.portrait ?? `cards-data/art/${deckPool[0]?.cardNumber ?? "001"}.jpg`,
      profile: existing.profile ?? { strategy: "passive", parameters: {} },
      deckSeed: existing.deckSeed ?? DEFAULT_DECK_SEED,
      deckPool,
      dropPools,
    });
    if (!parsed.success) {
      return err(
        new DomainError("The extracted duelist failed its schema.", "invalid_duelist_source", {
          issues: parsed.error.issues,
        }),
      );
    }

    await mkdir(DUELISTS_DIR, { recursive: true });
    await writeFile(path, `${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");
    return ok(parsed.data);
  } finally {
    database.close();
  }
}

function readArgument(argv: readonly string[], flag: string): string | undefined {
  const prefix = `--${flag}=`;
  return argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main(argv: readonly string[]): Promise<number> {
  const id = readArgument(argv, "id");
  const name = readArgument(argv, "name");
  const rawFmId = readArgument(argv, "fm-id");
  if (id === undefined || (name === undefined && rawFmId === undefined)) {
    console.error(
      'Usage: node scripts/extract-fm-duelist.ts --id=<slug> (--name="Teana" | --fm-id=2) [--difficulty=easy]',
    );
    return 1;
  }

  const result = await extractDuelist({
    id,
    name,
    ...(rawFmId === undefined ? {} : { fmId: Number(rawFmId) }),
    ...(readArgument(argv, "difficulty") === undefined
      ? {}
      : { difficulty: readArgument(argv, "difficulty") }),
  });
  if (!result.ok) {
    console.error(`Extraction failed (${result.error.code}): ${result.error.message}`);
    console.error(JSON.stringify(result.error.details, null, 2));
    return 1;
  }

  const totalDropCards = result.value.dropPools.reduce(
    (total, pool) => total + pool.entries.length,
    0,
  );
  console.log(
    `Extracted ${result.value.name} (FM id ${String(result.value.fmDuelistId)}): ` +
      `${String(result.value.deckPool?.length ?? 0)} deck-pool cards, ` +
      `${String(totalDropCards)} drop-pool entries across ${String(result.value.dropPools.length)} tiers.`,
  );
  return 0;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await main(process.argv.slice(2));
}
