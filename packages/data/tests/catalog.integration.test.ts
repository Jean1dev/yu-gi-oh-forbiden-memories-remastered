import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CANONICAL_CARD_TOTAL, CARD_TYPES, GUARDIAN_STARS } from "@yugioh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CardCatalog } from "../src/catalog/types.ts";
import { DEFAULT_OPTIONS as INGESTION_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";
import { loadCatalogFromDisk } from "../scripts/load-catalog-from-disk.ts";
import { DEFAULT_OPTIONS as VALIDATION_OPTIONS, runValidation } from "../scripts/validate-cards.ts";

/**
 * Runs the real catalog over the real output of the real ingestion and the real
 * integrity gate. These are the acceptance tests for the PRD F03 criteria: the
 * dataset is the genuine one, so the counts and the latencies are the ones
 * consumers will actually get.
 */

/** PRD F03: identity lookup. */
const MAX_GET_BY_NUMERO_MS = 1;
/** PRD F03: listing by criterion over the whole catalog. */
const MAX_LIST_MS = 50;
/** PRD F03: cold start, from three files on disk to a catalog answering. */
const MAX_LOAD_MS = 500;

/** The inflated number the PRD asks never to reappear: source files, not cards. */
const SOURCE_FILE_COUNT = 821;

let workDir = "";
let sealedDir = "";
let catalog: CardCatalog;

async function elapsed(run: () => Promise<void> | void): Promise<number> {
  const startedAt = performance.now();
  await run();
  return performance.now() - startedAt;
}

/** Copies the sealed artifacts so a test can break one without touching the original. */
async function tamperedCopy(name: string): Promise<string> {
  const target = join(workDir, name);
  await cp(sealedDir, target, { recursive: true });
  return target;
}

async function loadOrFail(generatedDir: string): Promise<CardCatalog> {
  const result = await loadCatalogFromDisk({ generatedDir });
  if (!result.ok) {
    throw new Error(`catalog was expected to load: ${result.error.message}`);
  }
  return result.value;
}

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-catalog-"));
  sealedDir = join(workDir, "sealed");

  const ingestionExit = await runIngestion({ ...INGESTION_OPTIONS, outputDir: sealedDir });
  expect(ingestionExit).toBe(0);

  const validationExit = await runValidation({
    generatedDir: sealedDir,
    placeholderPath: VALIDATION_OPTIONS.placeholderPath,
  });
  expect(validationExit).toBe(0);

  catalog = await loadOrFail(sealedDir);
}, 60_000);

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("catalog over the real sealed dataset", () => {
  it("answers getByNumero for every card well inside 1ms each", async () => {
    const numeros = Array.from({ length: CANONICAL_CARD_TOTAL }, (_unused, index) =>
      String(index + 1).padStart(3, "0"),
    );

    const spent = await elapsed(() => {
      for (const numero of numeros) {
        expect(catalog.getByNumero(numero)?.numero).toBe(numero);
      }
    });

    expect(spent / numeros.length).toBeLessThan(MAX_GET_BY_NUMERO_MS);
  });

  it("returns undefined for a numero beyond the catalog", () => {
    expect(catalog.getByNumero("999")).toBeUndefined();
    expect(catalog.getByNumero("000")).toBeUndefined();
  });

  it("answers listByTipo, listByClasse and listByGuardiao inside 50ms each", async () => {
    const classes = Object.keys(catalog.countByClasse());
    expect(classes.length).toBeGreaterThan(0);

    for (const tipo of CARD_TYPES) {
      const spent = await elapsed(() => {
        expect(catalog.listByTipo(tipo).length).toBe(catalog.countByTipo()[tipo]);
      });
      expect(spent).toBeLessThan(MAX_LIST_MS);
    }

    for (const classe of classes) {
      const spent = await elapsed(() => {
        expect(catalog.listByClasse(classe).length).toBe(catalog.countByClasse()[classe]);
      });
      expect(spent).toBeLessThan(MAX_LIST_MS);
    }

    for (const guardiao of GUARDIAN_STARS) {
      const spent = await elapsed(() => {
        catalog.listByGuardiao(guardiao);
      });
      expect(spent).toBeLessThan(MAX_LIST_MS);
    }
  });

  it("finds a real card by the password printed on it", () => {
    const withPassword = catalog
      .listByTipo("monstro")
      .find((card) => card.password !== null)?.password;
    expect(withPassword).toBeDefined();

    const result = catalog.findByPassword(withPassword ?? "");

    expect(result.found).toBe(true);
    if (!result.found) {
      return;
    }
    expect(result.card.password).toBe(withPassword);
  });

  it("tells a malformed password from an unknown one", () => {
    expect(catalog.findByPassword("nao-e-uma-senha")).toEqual({
      found: false,
      reason: "invalid_format",
    });
    expect(catalog.findByPassword("00 00 00 00")).toEqual({
      found: false,
      reason: "not_found",
    });
  });

  it("loads the whole catalog from disk inside 500ms", async () => {
    const spent = await elapsed(async () => {
      await loadOrFail(sealedDir);
    });

    expect(spent).toBeLessThan(MAX_LOAD_MS);
  });

  it("exposes 722 as the canonical count, never 821", () => {
    expect(catalog.totalCount()).toBe(CANONICAL_CARD_TOTAL);
    expect(catalog.totalCount()).not.toBe(SOURCE_FILE_COUNT);
  });

  it("keeps every index consistent with the canonical count", () => {
    const perTipo = catalog.countByTipo();
    const perClasse = catalog.countByClasse();

    const typeTotal = CARD_TYPES.reduce((sum, tipo) => sum + perTipo[tipo], 0);
    const classTotal = Object.values(perClasse).reduce((sum, count) => sum + count, 0);

    expect(typeTotal).toBe(CANONICAL_CARD_TOTAL);
    expect(classTotal).toBe(CANONICAL_CARD_TOTAL);
    // The breakdown verified against the real data in docs/arquitetura.md §4.2.
    expect(perTipo).toEqual({
      monstro: 621,
      ritual: 24,
      equipamento: 34,
      magica: 33,
      armadilha: 10,
    });
  });

  it("exposes complementary legacy and crop manifests for every card", async () => {
    const onDisk = JSON.parse(
      await readFile(join(sealedDir, "arts-manifest.json"), "utf8"),
    ) as Record<string, string>;

    expect(catalog.getArtManifest()).toEqual(onDisk);
    const legacyNumbers = Object.keys(catalog.getArtManifest());
    const cropNumbers = Object.keys(catalog.getCropArtManifest());
    expect(new Set([...legacyNumbers, ...cropNumbers]).size).toBe(CANONICAL_CARD_TOTAL);
    expect(legacyNumbers).toHaveLength(38);
    expect(cropNumbers).toHaveLength(684);
  });

  it("stays immutable: a write to a card it served throws", () => {
    const card = catalog.getByNumero("001");

    expect(card).toBeDefined();
    expect(() => {
      (card as unknown as { atk: number }).atk = 9999;
    }).toThrow(TypeError);
  });
});

describe("catalog refusing to serve", () => {
  it("refuses a dataset whose seal says invalid", async () => {
    const generatedDir = await tamperedCopy("unsealed");
    await writeFile(
      join(generatedDir, "dataset-seal.json"),
      `${JSON.stringify({ valid: false, generatedAt: "2026-07-27T12:05:00.000Z" }, null, 2)}\n`,
      "utf8",
    );

    const result = await loadCatalogFromDisk({ generatedDir });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("catalog_unavailable");
  });

  it("refuses to load when the seal is missing", async () => {
    const generatedDir = await tamperedCopy("no-seal");
    await rm(join(generatedDir, "dataset-seal.json"));

    const result = await loadCatalogFromDisk({ generatedDir });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("artifact_missing");
  });

  it("refuses to load when the dataset itself is missing", async () => {
    const generatedDir = await tamperedCopy("no-cards");
    await rm(join(generatedDir, "cards.json"));

    const result = await loadCatalogFromDisk({ generatedDir });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("artifact_missing");
  });

  it("refuses a sealed dataset a maintainer edited after the seal", async () => {
    const generatedDir = await tamperedCopy("edited-after-seal");
    const cardsPath = join(generatedDir, "cards.json");
    const cards = JSON.parse(await readFile(cardsPath, "utf8")) as Record<string, unknown>[];
    const first = cards[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      first["tipo"] = "invencao";
    }
    await writeFile(cardsPath, JSON.stringify(cards, null, 2), "utf8");

    const result = await loadCatalogFromDisk({ generatedDir });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("dataset_inconsistent_with_seal");
    expect(result.error.details["numeros"]).toEqual(["001"]);
  });
});

/**
 * Static analysis, kept next to the integration tests it protects: the boundary
 * rules in .dependency-cruiser.cjs cover imports, and these cover the two
 * things a config file cannot see — that the catalog core reaches for no I/O,
 * and that nothing but the adapters knows the artifact files exist at all.
 */
describe("catalog boundaries", () => {
  const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
  const NOT_OUR_CODE = /node_modules|[/\\]generated[/\\]/;
  const CATALOG_CORE = join(import.meta.dirname, "..", "src", "catalog");
  const PACKAGES_ROOT = join(import.meta.dirname, "..", "..");

  async function sourceFiles(directory: string): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true, recursive: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => join(entry.parentPath, entry.name))
      .filter((path) => !path.endsWith(".test.ts") && !NOT_OUR_CODE.test(path));
  }

  /** Lines that actually run, so a filename quoted in a doc comment does not count. */
  async function codeLines(path: string): Promise<readonly string[]> {
    const content = await readFile(path, "utf8");
    return content.split("\n").filter((line) => !COMMENT_LINE.test(line));
  }

  it("keeps the catalog core free of filesystem and network access", async () => {
    const files = await sourceFiles(CATALOG_CORE);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      for (const line of await codeLines(file)) {
        expect(line).not.toMatch(/from "node:/);
        expect(line).not.toMatch(/\bfetch\s*\(/);
      }
    }
  });

  it("leaves the generated artifacts known only to the adapters", async () => {
    const artifacts = ["cards.json", "arts-manifest.json", "dataset-seal.json"];
    const offenders: string[] = [];

    for (const file of await sourceFiles(PACKAGES_ROOT)) {
      if (file.includes(`${join("data", "scripts")}`)) {
        continue;
      }
      for (const line of await codeLines(file)) {
        if (artifacts.some((artifact) => line.includes(artifact))) {
          offenders.push(`${file}: ${line.trim()}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
