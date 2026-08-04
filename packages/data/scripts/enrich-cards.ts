import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type Card, type CardNumber } from "@yugioh/shared";
import { z } from "zod";

import { CardEnrichmentTableSchema, type CardEnrichmentTable } from "../src/ingestion/enrichment.ts";
import { SourceEnvelopeSchema } from "../src/ingestion/envelope.ts";
import { cardNumberFromFileName, normalizeCard } from "../src/ingestion/normalize-card.ts";
import { parseYgoprodeckMatch } from "../src/ygoprodeck/index.ts";
import type { MatchOutcome, YgoprodeckMatch } from "../src/ygoprodeck/types.ts";
import { fetchById, fetchByName } from "./ygoprodeck-client.ts";

/**
 * Injected the same way `CardCatalogLookup` is elsewhere in the project, so
 * tests supply a stub instead of mocking the `fetch`-backed module (spec F02
 * §7 — "stub só em teste, nunca em produção").
 */
export type YgoprodeckClient = Readonly<{
  fetchById: typeof fetchById;
  fetchByName: typeof fetchByName;
}>;

const REAL_CLIENT: YgoprodeckClient = { fetchById, fetchByName };

/**
 * Orchestrates F02 end to end: resolves each target card's match key, calls
 * the YGOPRODeck client, and writes the two artifacts. The only I/O adapter
 * for this feature (spec F02, Alocação no Monorepo) — matching/mapping logic
 * itself lives in `src/ygoprodeck` and stays pure.
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const RATE_LIMIT_MS = 300;

export type EnrichmentOptions = Readonly<{
  sourceDir: string;
  enrichmentTablePath: string;
  overridesPath: string;
  artUrlsPath: string;
  targetNumbers: readonly CardNumber[];
  client: YgoprodeckClient;
}>;

/**
 * 15 cards spanning all 5 `tipo` values and a range of attributes, verified
 * by hand against the live API while planning this feature (spec F02,
 * Decision 1). `renderizacao-cartas/F07` reuses this script with a different
 * `targetNumbers` for the full rollout.
 */
export const PILOT_CARD_NUMBERS: readonly CardNumber[] = [
  "001",
  "002",
  "003",
  "004",
  "006",
  "050",
  "300",
  "301",
  "304",
  "320",
  "330",
  "670",
  "671",
  "681",
  "685",
];

export const DEFAULT_OPTIONS: EnrichmentOptions = {
  sourceDir: join(REPO_ROOT, "cards-data", "dados"),
  enrichmentTablePath: join(REPO_ROOT, "cards-data", "dados", "enriquecimento-ygoprodeck.json"),
  overridesPath: join(REPO_ROOT, "cards-data", "dados", "overrides-nomes-ygoprodeck.json"),
  artUrlsPath: join(PACKAGE_ROOT, "generated", "ygoprodeck-art-urls.json"),
  targetNumbers: PILOT_CARD_NUMBERS,
  client: REAL_CLIENT,
};

const OverridesSchema = z.record(z.string(), z.string());
type Overrides = Readonly<Record<CardNumber, string>>;

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function readJsonOrDefault<T>(
  path: string,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (isFileNotFound(error)) {
      return fallback;
    }
    throw new Error(`failed to read ${path}`, { cause: error });
  }

  const validated = schema.safeParse(JSON.parse(raw));
  if (!validated.success) {
    throw new Error(`${path} does not match the expected shape`, { cause: validated.error });
  }
  return validated.data;
}

async function readTargetCard(sourceDir: string, numero: CardNumber): Promise<Card> {
  const fileName = `${numero}.json`;
  const raw = await readFile(join(sourceDir, fileName), "utf8");
  const envelope = SourceEnvelopeSchema.parse(JSON.parse(raw));
  if (!envelope.success) {
    throw new Error(`source record for ${numero} reports an error envelope`);
  }
  const normalized = normalizeCard(envelope.card, fileName);
  if (!normalized.ok) {
    throw new Error(`source record for ${numero} does not normalize: ${normalized.error.message}`);
  }
  if (cardNumberFromFileName(fileName) !== normalized.value.numero) {
    throw new Error(`numero mismatch reading ${fileName}`);
  }
  return normalized.value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

/** One card's worth of matching, including the rate-limited network call(s). */
async function matchCard(
  card: Card,
  overrides: Overrides,
  client: YgoprodeckClient,
): Promise<MatchOutcome> {
  const passwordDigits = card.password?.replaceAll(" ", "") ?? null;

  if (passwordDigits === null) {
    const overrideName = overrides[card.numero];
    if (overrideName === undefined) {
      return { kind: "unmatched", numero: card.numero, reason: "no_password_no_override" };
    }
    return matchByName(card, overrideName, client);
  }

  const fetched = await client.fetchById(Number(passwordDigits));
  if (!fetched.ok) {
    return { kind: "unmatched", numero: card.numero, reason: "http_error", detail: fetched.error.message };
  }
  const [record] = fetched.value;
  if (record === undefined) {
    return { kind: "unmatched", numero: card.numero, reason: "not_found" };
  }
  return toOutcome(card, record);
}

async function matchByName(
  card: Card,
  name: string,
  client: YgoprodeckClient,
): Promise<MatchOutcome> {
  const fetched = await client.fetchByName(name);
  if (!fetched.ok) {
    return { kind: "unmatched", numero: card.numero, reason: "http_error", detail: fetched.error.message };
  }
  if (fetched.value.length === 0) {
    return { kind: "unmatched", numero: card.numero, reason: "not_found" };
  }
  if (fetched.value.length > 1) {
    return { kind: "unmatched", numero: card.numero, reason: "ambiguous" };
  }
  const [record] = fetched.value;
  if (record === undefined) {
    return { kind: "unmatched", numero: card.numero, reason: "not_found" };
  }
  return toOutcome(card, record);
}

function toOutcome(card: Card, record: Parameters<typeof parseYgoprodeckMatch>[2]): MatchOutcome {
  const parsed = parseYgoprodeckMatch(card.numero, card.tipo, record);
  if (!parsed.ok) {
    return {
      kind: "unmatched",
      numero: card.numero,
      reason: "invalid_response",
      detail: parsed.error.message,
    };
  }
  return { kind: "matched", match: parsed.value };
}

function printReport(outcomes: readonly MatchOutcome[]): void {
  const matched = outcomes.filter((outcome) => outcome.kind === "matched");
  const unmatched = outcomes.filter((outcome) => outcome.kind === "unmatched");

  console.log(`Target cards:  ${String(outcomes.length)}`);
  console.log(`Matched:       ${String(matched.length)}`);
  console.log(`Unmatched:     ${String(unmatched.length)}`);
  for (const outcome of unmatched) {
    if (outcome.kind !== "unmatched") continue;
    const suffix = outcome.detail === undefined ? "" : ` (${outcome.detail})`;
    console.warn(`  ${outcome.numero}: ${outcome.reason}${suffix}`);
  }
}

export async function runEnrichment(options: EnrichmentOptions = DEFAULT_OPTIONS): Promise<number> {
  const [existingTable, overrides] = await Promise.all([
    readJsonOrDefault(options.enrichmentTablePath, CardEnrichmentTableSchema, {}),
    readJsonOrDefault(options.overridesPath, OverridesSchema, {}),
  ]);

  const outcomes: MatchOutcome[] = [];
  const targets = [...options.targetNumbers].sort((left, right) => left.localeCompare(right));

  for (const numero of targets) {
    const card = await readTargetCard(options.sourceDir, numero);
    const outcome = await matchCard(card, overrides, options.client);
    outcomes.push(outcome);
    const madeApiCall = outcome.kind === "matched" || outcome.reason !== "no_password_no_override";
    if (madeApiCall) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const matches: YgoprodeckMatch[] = outcomes
    .filter((outcome): outcome is Extract<MatchOutcome, { kind: "matched" }> => outcome.kind === "matched")
    .map((outcome) => outcome.match);

  const nextTable: Record<CardNumber, CardEnrichmentTable[string]> = { ...existingTable };
  const artUrls: Record<CardNumber, string> = {};
  for (const match of matches) {
    nextTable[match.numero] = {
      atributo: match.atributo,
      nivel: match.nivel,
      descricao: match.descricao,
    };
    artUrls[match.numero] = match.artCropUrl;
  }

  await mkdir(dirname(options.artUrlsPath), { recursive: true });
  await Promise.all([
    writeFile(options.enrichmentTablePath, `${JSON.stringify(nextTable, null, 2)}\n`, "utf8"),
    writeFile(options.artUrlsPath, `${JSON.stringify(artUrls, null, 2)}\n`, "utf8"),
  ]);

  printReport(outcomes);
  return 0;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runEnrichment();
}
