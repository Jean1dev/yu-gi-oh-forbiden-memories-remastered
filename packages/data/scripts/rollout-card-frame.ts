import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CardNumberSchema, type CardNumber } from "@yugioh/shared";

import { readJpegDimensions } from "../src/art/jpeg-dimensions.ts";
import { CardEnrichmentTableSchema } from "../src/ingestion/enrichment.ts";
import {
  checkCardFrameCoverage,
  type CardFrameCoverageReport,
} from "../src/validation/check-card-frame-coverage.ts";
import { allCardNumbers } from "./enrich-cards.ts";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const MIN_LONG_SIDE_PX = 400;
const CARD_ART_FILE = /^([0-9]{3})\.jpg$/i;

export type CardFrameRolloutOptions = Readonly<{
  enrichmentPath: string;
  cropArtDir: string;
  legacyArtDir: string;
  reportPath: string;
  cardNumbers: readonly CardNumber[];
  apply: boolean;
}>;

export const DEFAULT_OPTIONS: CardFrameRolloutOptions = {
  enrichmentPath: join(REPO_ROOT, "cards-data", "enriquecimento-ygoprodeck.json"),
  cropArtDir: join(REPO_ROOT, "cards-data", "art"),
  legacyArtDir: join(REPO_ROOT, "cards-data"),
  reportPath: join(PACKAGE_ROOT, "generated", "card-frame-coverage-report.json"),
  cardNumbers: allCardNumbers(),
  apply: false,
};

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function readEnrichedNumbers(path: string): Promise<ReadonlySet<CardNumber>> {
  const parsed = CardEnrichmentTableSchema.parse(JSON.parse(await readFile(path, "utf8")));
  return new Set(Object.keys(parsed));
}

async function listCardArtNumbers(directory: string): Promise<ReadonlySet<CardNumber>> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    if (isFileNotFound(error)) return new Set();
    throw error;
  }

  const numbers = new Set<CardNumber>();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = CARD_ART_FILE.exec(entry.name);
    const parsed = CardNumberSchema.safeParse(match?.[1]);
    if (parsed.success) numbers.add(parsed.data);
  }
  return numbers;
}

async function listValidCropArtNumbers(directory: string): Promise<ReadonlySet<CardNumber>> {
  const candidates = await listCardArtNumbers(directory);
  const valid = new Set<CardNumber>();
  for (const numero of candidates) {
    const bytes = new Uint8Array(await readFile(join(directory, `${numero}.jpg`)));
    const dimensions = readJpegDimensions(bytes);
    if (dimensions !== null && Math.max(dimensions.width, dimensions.height) >= MIN_LONG_SIDE_PX) {
      valid.add(numero);
    }
  }
  return valid;
}

async function writeReport(path: string, report: CardFrameCoverageReport): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function legacyPath(directory: string, numero: CardNumber): string {
  const root = resolve(directory);
  const candidate = resolve(root, `${numero}.jpg`);
  if (dirname(candidate) !== root || candidate !== join(root, `${numero}.jpg`)) {
    throw new Error(`refusing legacy art path outside the configured directory: ${candidate}`);
  }
  return candidate;
}

async function removeEligibleLegacyArt(
  directory: string,
  numbers: readonly CardNumber[],
): Promise<void> {
  for (const numero of numbers) {
    const path = legacyPath(directory, numero);
    try {
      await access(path);
      await unlink(path);
    } catch (error: unknown) {
      if (!isFileNotFound(error)) {
        throw new Error(`failed to remove legacy art for ${numero}`, { cause: error });
      }
    }
  }
}

function printReport(report: CardFrameCoverageReport, apply: boolean): void {
  console.log(`Catalog cards:          ${String(report.totalCards)}`);
  console.log(`Migrated:               ${String(report.migrated.length)}`);
  console.log(`Legacy fallback:        ${String(report.legacyFallback.length)}`);
  console.log(`Inconsistent:           ${String(report.inconsistent.length)}`);
  console.log(`Uncovered:              ${String(report.uncovered.length)}`);
  console.log(`Legacy removal targets: ${String(report.legacyFilesEligibleForRemoval.length)}`);
  console.log(apply ? "Rollout mode: apply" : "Rollout mode: dry-run");
}

export async function runCardFrameRollout(
  options: CardFrameRolloutOptions = DEFAULT_OPTIONS,
): Promise<number> {
  const [enrichedNumbers, validCropArtNumbers, legacyArtNumbers] = await Promise.all([
    readEnrichedNumbers(options.enrichmentPath),
    listValidCropArtNumbers(options.cropArtDir),
    listCardArtNumbers(options.legacyArtDir),
  ]);

  const report = checkCardFrameCoverage({
    cardNumbers: options.cardNumbers,
    enrichedNumbers,
    validCropArtNumbers,
    legacyArtNumbers,
  });
  await writeReport(options.reportPath, report);
  printReport(report, options.apply);

  if (!report.complete) {
    console.error("CardFrame rollout blocked: coverage is incomplete or inconsistent.");
    return 1;
  }
  if (options.apply) {
    await removeEligibleLegacyArt(options.legacyArtDir, report.legacyFilesEligibleForRemoval);
  }
  return 0;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runCardFrameRollout({
    ...DEFAULT_OPTIONS,
    apply: process.argv.includes("--apply"),
  });
}
