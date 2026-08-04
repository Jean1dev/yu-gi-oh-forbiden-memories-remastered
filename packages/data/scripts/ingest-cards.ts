import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildArtManifest } from "../src/ingestion/art-manifest.ts";
import { CardEnrichmentTableSchema, type CardEnrichmentTable } from "../src/ingestion/enrichment.ts";
import { ingestSource, type SourceFile } from "../src/ingestion/ingest-source.ts";
import { serializeArtifacts, serializeArtManifest } from "../src/ingestion/serialize.ts";
import { checkCardFrameCoverage } from "../src/validation/check-card-frame-coverage.ts";

/**
 * The only boundary with the filesystem. Everything below `src/ingestion` is
 * pure and receives already-read content
 * (TypeScript-development-guidelines.md §7.3, §19.2).
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");

export type IngestionOptions = Readonly<{
  sourceDir: string;
  artsDir: string;
  /** `cards-data/art/` — the crop-art pilot from `renderizacao-cartas/F03`. */
  cropArtsDir: string;
  outputDir: string;
  enrichmentPath: string;
}>;

export const DEFAULT_OPTIONS: IngestionOptions = {
  sourceDir: join(REPO_ROOT, "cards-data", "dados"),
  artsDir: join(REPO_ROOT, "cards-data"),
  cropArtsDir: join(REPO_ROOT, "cards-data", "art"),
  outputDir: join(PACKAGE_ROOT, "generated"),
  enrichmentPath: join(REPO_ROOT, "cards-data", "enriquecimento-ygoprodeck.json"),
};

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

async function listFiles(directory: string, extension: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function readSourceFiles(directory: string): Promise<readonly SourceFile[]> {
  const names = await listFiles(directory, ".json");
  return Promise.all(
    names.map(async (name) => ({
      name,
      content: await readFile(join(directory, name), "utf8"),
    })),
  );
}

/**
 * Art paths are stored relative to the repository root, so the manifest means
 * the same thing regardless of where the ingestion ran from.
 */
async function listArtPaths(directory: string): Promise<readonly string[]> {
  const names = await listFiles(directory, ".jpg");
  return names.map((name) => relative(REPO_ROOT, join(directory, name)));
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/**
 * Reads the external enrichment table (spec `renderizacao-cartas/F01` §5). An
 * absent file is the normal state before F02/F07 has run and means "nothing
 * enriched yet" — never an error. A file that exists but is corrupt is a build
 * error and aborts the whole ingestion (spec §6), same severity as a broken
 * source directory.
 */
async function readEnrichmentTable(path: string): Promise<CardEnrichmentTable> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (isFileNotFound(error)) {
      return {};
    }
    throw new Error(`failed to read enrichment table at ${path}`, { cause: error });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    throw new Error(`enrichment table at ${path} is not valid JSON`, { cause: error });
  }

  const validated = CardEnrichmentTableSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`enrichment table at ${path} does not match the expected shape`, {
      cause: validated.error,
    });
  }
  return validated.data;
}

function printSummary(report: {
  filesRead: number;
  discardedByError: number;
  discardedAsInvalid: readonly { file: string; reason: string }[];
  cardsEmitted: number;
  artsFound: number;
  missingNumbers: readonly string[];
  missingArts: readonly string[];
  orphanArts: readonly string[];
  discardedEnrichment: readonly { numero: string; reason: string }[];
  complete: boolean;
}): void {
  console.log(`Files read:            ${String(report.filesRead)}`);
  console.log(`Discarded (error):     ${String(report.discardedByError)}`);
  console.log(`Discarded (invalid):   ${String(report.discardedAsInvalid.length)}`);
  console.log(`Cards emitted:         ${String(report.cardsEmitted)}`);
  console.log(`Arts resolved:         ${String(report.artsFound)}`);
  console.log(`Enrichment discarded:  ${String(report.discardedEnrichment.length)}`);

  for (const discarded of report.discardedAsInvalid) {
    console.warn(`Invalid record ignored: ${discarded.file} (${discarded.reason})`);
  }
  for (const numero of report.missingNumbers) {
    console.warn(`Missing numero: ${numero}`);
  }
  for (const numero of report.missingArts) {
    console.warn(`Missing art for card ${numero}`);
  }
  for (const path of report.orphanArts) {
    console.warn(`Orphan art: ${path}`);
  }
  for (const discarded of report.discardedEnrichment) {
    console.warn(`Enrichment ignored for card ${discarded.numero}: ${discarded.reason}`);
  }

  console.log(
    report.complete
      ? "Ingestion complete: dataset is contiguous and nothing was discarded as invalid."
      : "Ingestion incomplete: see the warnings above and ingestion-report.json.",
  );
}

/**
 * Runs the ingestion end to end and returns the process exit code.
 *
 * Nothing is written when the source is missing or empty: a partial dataset on
 * disk is worse than none, because every downstream consumer would treat it as
 * authoritative (spec F01 §6).
 */
export async function runIngestion(options: IngestionOptions = DEFAULT_OPTIONS): Promise<number> {
  const files = await readSourceFiles(options.sourceDir);
  if (files.length === 0) {
    console.error(
      `Card source not found at ${relative(REPO_ROOT, options.sourceDir)} — ingestion cancelled.`,
    );
    return EXIT_FAILURE;
  }

  const availableArts = await listArtPaths(options.artsDir);
  const enrichment = await readEnrichmentTable(options.enrichmentPath);

  const ingestion = ingestSource({
    files,
    availableArts,
    enrichment,
    generatedAt: new Date().toISOString(),
  });
  if (!ingestion.ok) {
    console.error(`Ingestion aborted (${ingestion.error.code}): ${ingestion.error.message}`);
    return EXIT_FAILURE;
  }

  const artifacts = serializeArtifacts(ingestion.value);

  const cropArts = await listArtPaths(options.cropArtsDir);
  const cropManifest = buildArtManifest(ingestion.value.cards, cropArts);
  const cropArtManifestJson = serializeArtManifest(cropManifest.manifest);
  const coverageReport = checkCardFrameCoverage({
    cardNumbers: ingestion.value.cards.map((card) => card.numero),
    enrichedNumbers: new Set(
      ingestion.value.cards
        .filter((card) => card.descricao !== null)
        .map((card) => card.numero),
    ),
    validCropArtNumbers: new Set(Object.keys(cropManifest.manifest)),
    legacyArtNumbers: new Set(Object.keys(ingestion.value.manifest)),
  });
  const coverageReportJson = `${JSON.stringify(coverageReport, null, 2)}\n`;

  try {
    await mkdir(options.outputDir, { recursive: true });
    await Promise.all([
      writeFile(join(options.outputDir, "cards.json"), artifacts.cardsJson, "utf8"),
      writeFile(join(options.outputDir, "arts-manifest.json"), artifacts.artManifestJson, "utf8"),
      writeFile(join(options.outputDir, "crop-arts-manifest.json"), cropArtManifestJson, "utf8"),
      writeFile(
        join(options.outputDir, "card-frame-coverage-report.json"),
        coverageReportJson,
        "utf8",
      ),
      writeFile(
        join(options.outputDir, "ingestion-report.json"),
        artifacts.ingestionReportJson,
        "utf8",
      ),
    ]);
  } catch (error: unknown) {
    throw new Error(`failed to write ingestion artifacts to ${options.outputDir}`, {
      cause: error,
    });
  }

  printSummary(ingestion.value.report);
  console.log(`Crop arts resolved:    ${String(Object.keys(cropManifest.manifest).length)}`);
  console.log(`CardFrame migrated:    ${String(coverageReport.migrated.length)}`);
  console.log(`Legacy fallbacks:      ${String(coverageReport.legacyFallback.length)}`);
  return ingestion.value.report.complete && coverageReport.complete
    ? EXIT_SUCCESS
    : EXIT_FAILURE;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runIngestion();
}
