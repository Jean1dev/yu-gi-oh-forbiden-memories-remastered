import { readFile, readdir, rm } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CANONICAL_CARD_TOTAL, DEFAULT_ART_PLACEHOLDER_PATH } from "@yugioh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createArtResolverFromCatalog } from "../src/art/create-art-resolver.ts";
import type { ArtManifest } from "../src/ingestion/art-manifest.ts";
import type { CardCatalog } from "../src/catalog/types.ts";
import { DEFAULT_OPTIONS as INGESTION_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";
import { loadCatalogFromDisk } from "../scripts/load-catalog-from-disk.ts";
import { DEFAULT_OPTIONS as VALIDATION_OPTIONS, runValidation } from "../scripts/validate-cards.ts";

/**
 * Runs art resolution over the real catalog built from the real ingestion and
 * the real integrity gate (F01+F02+F03). These are the acceptance tests for
 * the PRD F04 criteria and the Cross-Feature Integration criterion tying F04
 * to F03's 722-card count.
 */

let workDir = "";
let sealedDir = "";
let catalog: CardCatalog;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-art-"));
  sealedDir = join(workDir, "sealed");

  const ingestionExit = await runIngestion({ ...INGESTION_OPTIONS, outputDir: sealedDir });
  expect(ingestionExit).toBe(0);

  const validationExit = await runValidation({
    generatedDir: sealedDir,
    placeholderPath: VALIDATION_OPTIONS.placeholderPath,
  });
  expect(validationExit).toBe(0);

  const result = await loadCatalogFromDisk({ generatedDir: sealedDir });
  if (!result.ok) {
    throw new Error(`catalog was expected to load: ${result.error.message}`);
  }
  catalog = result.value;
}, 60_000);

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("art resolution over the real sealed dataset", () => {
  it("covers all 722 cards with tipo arte, none falling to placeholder", () => {
    const resolver = createArtResolverFromCatalog(catalog);
    const numeros = Array.from({ length: CANONICAL_CARD_TOTAL }, (_unused, index) =>
      String(index + 1).padStart(3, "0"),
    );

    for (const numero of numeros) {
      const result = resolver.resolve(numero);
      expect(result.tipo).toBe("arte");
      expect(result.caminho).toBe(catalog.getArtManifest()[numero]);
    }
  });

  it("resolves every card fetched from the catalog by getByNumero", () => {
    const resolver = createArtResolverFromCatalog(catalog);
    const card = catalog.getByNumero("001");

    expect(card).toBeDefined();
    if (card === undefined) {
      return;
    }
    expect(resolver.resolve(card)).toEqual({
      numero: "001",
      tipo: "arte",
      caminho: catalog.getArtManifest()["001"],
    });
  });

  it("uses the manifest exposed by getArtManifest of the catalog loaded from disk", () => {
    const onDiskManifest = catalog.getArtManifest();
    const resolver = createArtResolverFromCatalog(catalog);

    for (const [numero, caminho] of Object.entries(onDiskManifest)) {
      expect(resolver.resolve(numero).caminho).toBe(caminho);
    }
  });

  it("returns the placeholder when a card is artificially removed from the manifest in memory", () => {
    const manifest = { ...catalog.getArtManifest() };
    delete manifest["001"];

    const resolver = createArtResolverFromCatalog({
      ...catalog,
      getArtManifest: () => manifest as ArtManifest,
    });

    expect(resolver.resolve("001")).toEqual({
      numero: "001",
      tipo: "placeholder",
      caminho: DEFAULT_ART_PLACEHOLDER_PATH,
    });
  });
});

/**
 * Static analysis, kept next to the integration tests it protects — the same
 * pattern as `catalog.integration.test.ts`. `packages/data/src/art` is
 * stricter than every other subsystem in this module: it has no adapter at
 * all, so zero I/O is not just a boundary rule, it is the entire point of the
 * subsystem (spec F04, Decision 6).
 */
describe("art boundaries", () => {
  const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
  const ART_CORE = join(import.meta.dirname, "..", "src", "art");

  async function sourceFiles(directory: string): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true, recursive: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => join(entry.parentPath, entry.name))
      .filter((path) => !path.endsWith(".test.ts"));
  }

  async function codeLines(path: string): Promise<readonly string[]> {
    const content = await readFile(path, "utf8");
    return content.split("\n").filter((line) => !COMMENT_LINE.test(line));
  }

  it("keeps the art core free of filesystem, process and network access", async () => {
    const files = await sourceFiles(ART_CORE);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      for (const line of await codeLines(file)) {
        expect(line).not.toMatch(/from "node:/);
        expect(line).not.toMatch(/\bfetch\s*\(/);
        expect(line).not.toMatch(/\bprocess\./);
      }
    }
  });

  it("imports only @yugioh/shared and sibling packages/data modules", async () => {
    const files = await sourceFiles(ART_CORE);

    for (const file of files) {
      for (const line of await codeLines(file)) {
        const match = /from "([^"]+)"/.exec(line);
        if (match?.[1] === undefined) {
          continue;
        }
        const specifier = match[1];
        const isAllowed =
          specifier === "@yugioh/shared" || specifier.startsWith(".") || specifier.startsWith("..");
        expect(isAllowed).toBe(true);
      }
    }
  });
});
