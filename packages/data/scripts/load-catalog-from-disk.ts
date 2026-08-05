import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DatasetSealSchema, DomainError, err, type Result } from "@yugioh/shared";

import { createCatalog } from "../src/catalog/create-catalog.ts";
import type { CardCatalog } from "../src/catalog/types.ts";
import { ArtManifestSchema } from "../src/ingestion/art-manifest.ts";

/**
 * The catalog's only boundary with the filesystem.
 *
 * It sits beside the ingestion and validation adapters rather than under
 * `src/catalog` because everything under a package's `src/` is held to being
 * free of I/O — the executable form of that rule is the `domain-cores-are-pure`
 * boundary check. Unlike its two neighbours this one is not a CLI: it is the
 * Node entry point consumers import (`@yugioh/data/catalog/disk`), so it
 * returns a `Result` and prints nothing.
 *
 * Loading the catalog into a browser is deliberately not here: `createCatalog`
 * does not care where the bytes came from, so the browser-side loader — which
 * belongs to F09's versioned bundle — only has to produce the same three
 * structures and call it (spec F03, Decision 2).
 */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");

export type LoadCatalogOptions = Readonly<{
  /** Where F01 wrote the dataset and the manifest, and F02 the seal. */
  generatedDir: string;
}>;

export const DEFAULT_OPTIONS: LoadCatalogOptions = {
  generatedDir: join(PACKAGE_ROOT, "generated"),
};

const CARDS_FILE = "cards.json";
const MANIFEST_FILE = "arts-manifest.json";
const CROP_MANIFEST_FILE = "crop-arts-manifest.json";
const SEAL_FILE = "dataset-seal.json";

function missingArtifact(path: string): DomainError {
  return new DomainError(
    `Catalog artifact not found or unreadable at ${relative(REPO_ROOT, path)}.`,
    "artifact_missing",
    { path },
  );
}

async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

/**
 * Reads the three generated artifacts and hands them to the pure core.
 *
 * A missing or unparseable file fails here, before the seal is even looked at:
 * an absent artifact is a broken precondition, not a verdict on the dataset,
 * and the two deserve different codes so a consumer can tell "nobody ran the
 * build" from "the build says this data is bad".
 *
 * The manifest and the seal are validated against their schemas on the way in —
 * they left this package as data and come back as untrusted files
 * (docs/arquitetura.md §4.1). The dataset itself travels on as `unknown`: the
 * core re-parses it card by card, which is where an inconsistency with the seal
 * has to surface.
 */
export async function loadCatalogFromDisk(
  options: LoadCatalogOptions = DEFAULT_OPTIONS,
): Promise<Result<CardCatalog, DomainError>> {
  const sealPath = join(options.generatedDir, SEAL_FILE);
  const parsedSeal = DatasetSealSchema.safeParse(await readJson(sealPath));
  if (!parsedSeal.success) {
    return err(missingArtifact(sealPath));
  }

  const manifestPath = join(options.generatedDir, MANIFEST_FILE);
  const parsedManifest = ArtManifestSchema.safeParse(await readJson(manifestPath));
  if (!parsedManifest.success) {
    return err(missingArtifact(manifestPath));
  }

  // Unlike the manifest above, a missing or malformed crop manifest never
  // fails the catalog: `renderizacao-cartas/F03`'s pilot art is additive, and
  // a checkout that has not run the updated `data:ingest` yet is a normal
  // state, not a broken one (spec F06, Alocação no Monorepo).
  const cropManifestPath = join(options.generatedDir, CROP_MANIFEST_FILE);
  const parsedCropManifest = ArtManifestSchema.safeParse(await readJson(cropManifestPath));
  const cropArtManifest = parsedCropManifest.success ? parsedCropManifest.data : {};

  const cardsPath = join(options.generatedDir, CARDS_FILE);
  const rawCards = await readJson(cardsPath);
  if (rawCards === null) {
    return err(missingArtifact(cardsPath));
  }

  return createCatalog({
    rawCards,
    manifest: parsedManifest.data,
    cropArtManifest,
    seal: parsedSeal.data,
  });
}
