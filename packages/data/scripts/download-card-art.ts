import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type CardNumber } from "@yugioh/shared";
import { z } from "zod";

import { readJpegDimensions } from "../src/art/jpeg-dimensions.ts";
import { allCardNumbers, PILOT_CARD_NUMBERS } from "./enrich-cards.ts";

/**
 * Downloads the crop art `renderizacao-cartas/F02` resolved URLs for, one card
 * at a time. The only I/O adapter of `renderizacao-cartas/F03` — validation
 * (`readJpegDimensions`) stays pure (spec F03, Alocação no Monorepo).
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const TIMEOUT_MS = 10_000;
const MIN_LONG_SIDE_PX = 400;
const JPEG_CONTENT_TYPE = "image/jpeg";

export type DownloadOutcome =
  | Readonly<{ kind: "downloaded"; numero: CardNumber; path: string; width: number; height: number }>
  | Readonly<{
      kind: "skipped";
      numero: CardNumber;
      reason: "no_url" | "http_error" | "not_jpeg" | "too_small";
    }>;

export type DownloadClient = (url: string) => Promise<
  | Readonly<{ ok: true; contentType: string | null; body: Uint8Array }>
  | Readonly<{ ok: false }>
>;

async function realFetch(url: string): ReturnType<DownloadClient> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false };
    }
    const body = new Uint8Array(await response.arrayBuffer());
    return { ok: true, contentType: response.headers.get("content-type"), body };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

export type DownloadOptions = Readonly<{
  artUrlsPath: string;
  outputDir: string;
  targetNumbers: readonly CardNumber[];
  client: DownloadClient;
}>;

export const DEFAULT_OPTIONS: DownloadOptions = {
  artUrlsPath: join(PACKAGE_ROOT, "generated", "ygoprodeck-art-urls.json"),
  outputDir: join(REPO_ROOT, "cards-data", "art"),
  targetNumbers: PILOT_CARD_NUMBERS,
  client: realFetch,
};

const ArtUrlsSchema = z.record(z.string(), z.string());

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function readArtUrls(path: string): Promise<Readonly<Record<CardNumber, string>>> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (isFileNotFound(error)) {
      return {};
    }
    throw new Error(`failed to read ${path}`, { cause: error });
  }
  return ArtUrlsSchema.parse(JSON.parse(raw));
}

/** Bytes `FF D8 FF` are the JPEG SOI marker followed by the next marker's start. */
function looksLikeJpeg(body: Uint8Array, contentType: string | null): boolean {
  if (contentType !== null && !contentType.startsWith(JPEG_CONTENT_TYPE)) {
    return false;
  }
  return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
}

async function downloadOne(
  numero: CardNumber,
  url: string,
  outputDir: string,
  client: DownloadClient,
): Promise<DownloadOutcome> {
  const response = await client(url);
  if (!response.ok) {
    return { kind: "skipped", numero, reason: "http_error" };
  }
  if (!looksLikeJpeg(response.body, response.contentType)) {
    return { kind: "skipped", numero, reason: "not_jpeg" };
  }
  const dimensions = readJpegDimensions(response.body);
  if (dimensions === null || Math.max(dimensions.width, dimensions.height) < MIN_LONG_SIDE_PX) {
    return { kind: "skipped", numero, reason: "too_small" };
  }

  const path = join(outputDir, `${numero}.jpg`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path, response.body);
  return { kind: "downloaded", numero, path, width: dimensions.width, height: dimensions.height };
}

function printReport(outcomes: readonly DownloadOutcome[]): void {
  const downloaded = outcomes.filter((outcome) => outcome.kind === "downloaded");
  const skipped = outcomes.filter((outcome) => outcome.kind === "skipped");

  console.log(`Target cards:  ${String(outcomes.length)}`);
  console.log(`Downloaded:    ${String(downloaded.length)}`);
  console.log(`Skipped:       ${String(skipped.length)}`);
  for (const outcome of skipped) {
    if (outcome.kind !== "skipped") continue;
    console.warn(`  ${outcome.numero}: ${outcome.reason}`);
  }
}

export async function runDownload(options: DownloadOptions = DEFAULT_OPTIONS): Promise<number> {
  const artUrls = await readArtUrls(options.artUrlsPath);
  const targets = [...options.targetNumbers].sort((left, right) => left.localeCompare(right));

  const outcomes: DownloadOutcome[] = [];
  for (const numero of targets) {
    const url = artUrls[numero];
    if (url === undefined) {
      outcomes.push({ kind: "skipped", numero, reason: "no_url" });
      continue;
    }
    outcomes.push(await downloadOne(numero, url, options.outputDir, options.client));
  }

  printReport(outcomes);
  return 0;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  const targetNumbers = process.argv.includes("--all") ? allCardNumbers() : PILOT_CARD_NUMBERS;
  process.exitCode = await runDownload({ ...DEFAULT_OPTIONS, targetNumbers });
}
