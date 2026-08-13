import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { DomainError, err, ok, type CardNumber, type Result } from "@yugioh/shared";

import { backfillEnrichment, type BackfillReport, type FmCardInfo } from "../src/ingestion/backfill-fm.ts";
import { CardEnrichmentTableSchema } from "../src/ingestion/enrichment.ts";
import { ensureDatabase, toCardNumber } from "./fm-gamedata-database.ts";

/**
 * Patches `cards-data/enriquecimento-ygoprodeck.json` with what only the
 * original game knows, using the datamine `extract-fm-*` already caches.
 *
 * The only boundary with SQLite and the filesystem for this backfill — the
 * merge itself lives in `src/ingestion/backfill-fm.ts` and is pure, which is
 * also the only place `packages/data`'s `vitest run --dir src` will execute
 * assertions from.
 *
 * Usage:
 *   node scripts/backfill-fm-enrichment.ts [--dry-run]
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const ENRICHMENT_PATH = join(REPO_ROOT, "cards-data", "enriquecimento-ygoprodeck.json");

function readCardInfo(database: DatabaseSync): ReadonlyMap<CardNumber, FmCardInfo> {
  const rows = database
    .prepare("select CardId, Description, Level, Type, Attribute from cardinfo order by CardId")
    .all() as readonly Record<string, unknown>[];
  return new Map(
    rows.map((row) => [
      toCardNumber(Number(row.CardId)),
      {
        Type: row.Type === null ? null : String(row.Type),
        Attribute: row.Attribute === null ? null : String(row.Attribute),
        Level: row.Level === null ? null : Number(row.Level),
        Description: row.Description === null ? null : String(row.Description),
      },
    ]),
  );
}

export async function runBackfill(
  options: Readonly<{ dryRun: boolean }>,
): Promise<Result<BackfillReport, DomainError>> {
  const databasePath = await ensureDatabase();
  if (!databasePath.ok) {
    return databasePath;
  }

  const parsed = CardEnrichmentTableSchema.safeParse(
    JSON.parse(await readFile(ENRICHMENT_PATH, "utf8")),
  );
  if (!parsed.success) {
    return err(
      new DomainError(
        "The enrichment table on disk does not match its schema.",
        "invalid_enrichment_table",
        { issues: parsed.error.issues.slice(0, 5) },
      ),
    );
  }

  const database = new DatabaseSync(databasePath.value, { readOnly: true });
  try {
    const { table, report } = backfillEnrichment(parsed.data, readCardInfo(database));
    if (!options.dryRun) {
      await writeFile(ENRICHMENT_PATH, `${JSON.stringify(table, null, 2)}\n`, "utf8");
    }
    return ok(report);
  } finally {
    database.close();
  }
}

async function main(argv: readonly string[]): Promise<number> {
  const result = await runBackfill({ dryRun: argv.includes("--dry-run") });
  if (!result.ok) {
    console.error(`Backfill failed (${result.error.code}): ${result.error.message}`);
    console.error(JSON.stringify(result.error.details, null, 2));
    return 1;
  }

  console.log(
    `Created ${String(result.value.entriesCreated.length)} entries, ` +
      `filled ${String(result.value.attributesFilled.length)} missing attributes ` +
      `and replaced ${String(result.value.descriptionsReplaced.length)} spell descriptions.`,
  );
  return 0;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await main(process.argv.slice(2));
}
