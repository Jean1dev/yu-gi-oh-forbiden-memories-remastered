import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CardCatalog } from "../src/catalog/types.ts";
import { DEFAULT_OPTIONS as INGESTION_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";
import { loadCatalogFromDisk } from "../scripts/load-catalog-from-disk.ts";
import { DEFAULT_OPTIONS as DROP_OPTIONS, loadDropTableFromDisk } from "../scripts/load-drop-table-from-disk.ts";
import { DEFAULT_OPTIONS as VALIDATION_OPTIONS, runValidation } from "../scripts/validate-cards.ts";

/**
 * Runs the real drop table over the catalog built from the real ingestion
 * and integrity gate (F01+F02+F03), and over the real seed
 * `drop-tables.json`. These are the acceptance tests for the PRD F08
 * criteria that do not depend on the pending drop values (spec F08,
 * Decision 10).
 */

let workDir = "";
let sealedDir = "";
let catalog: CardCatalog;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-drops-"));
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

describe("drop table over the real seed", () => {
  it("tabela de drops real carrega vazia hoje a partir de drop-tables.json", async () => {
    const result = await loadDropTableFromDisk({ filePath: DROP_OPTIONS.filePath, catalog });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.listDropPools()).toEqual([]);
    expect(result.value.countDropPools()).toBe(0);
  });

  it("obterPoolPorDuelista da tabela real nao lanca erro para qualquer duelista consultado", async () => {
    const result = await loadDropTableFromDisk({ filePath: DROP_OPTIONS.filePath, catalog });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(() => result.value.getPoolByDuelista("qualquer-duelista-hoje")).not.toThrow();
    expect(result.value.getPoolByDuelista("qualquer-duelista-hoje")).toEqual([]);
  });
});

describe("drop table over synthetic source against the real catalog", () => {
  async function loadWithFile(raw: unknown): ReturnType<typeof loadDropTableFromDisk> {
    const filePath = join(workDir, `synthetic-${String(Math.random())}.json`);
    await writeFile(filePath, JSON.stringify(raw), "utf8");
    return loadDropTableFromDisk({ filePath, catalog });
  }

  it("tabela de drops real aceita numero existente no catalogo quando construida com fixture", async () => {
    const result = await loadWithFile([
      { duelista: "duelista-fixture", entradas: [{ numero: "001", probabilidade: 1 }] },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.getPoolByDuelista("duelista-fixture")).toEqual([
      { numero: "001", probabilidade: 1 },
    ]);
  });

  it("tabela de drops real rejeita numero inexistente no catalogo quando construida com fixture", async () => {
    const result = await loadWithFile([
      { duelista: "duelista-fixture", entradas: [{ numero: "999", probabilidade: 1 }] },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("numero_dropavel_inexistente");
  });

  it("tabela de drops real resolve arquivo ausente como fallback neutro sem erro", async () => {
    const result = await loadDropTableFromDisk({
      filePath: join(workDir, "arquivo-que-nao-existe.json"),
      catalog,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.countDropPools()).toBe(0);
  });
});

/**
 * Static analysis, kept next to the integration tests it protects — same
 * pattern as `terrain.integration.test.ts` and `fusion.integration.test.ts`.
 */
describe("drops boundaries", () => {
  const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
  const DROPS_CORE = join(import.meta.dirname, "..", "src", "drops");

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

  it("keeps the drops core free of filesystem, process and network access", async () => {
    const files = await sourceFiles(DROPS_CORE);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      for (const line of await codeLines(file)) {
        expect(line).not.toMatch(/from "node:/);
        expect(line).not.toMatch(/\bfetch\s*\(/);
        expect(line).not.toMatch(/\bprocess\./);
      }
    }
  });

  it("imports only @yugioh/shared, zod and sibling packages/data modules", async () => {
    const files = await sourceFiles(DROPS_CORE);

    for (const file of files) {
      for (const line of await codeLines(file)) {
        const match = /from "([^"]+)"/.exec(line);
        if (match?.[1] === undefined) {
          continue;
        }
        const specifier = match[1];
        const isAllowed =
          specifier === "@yugioh/shared" ||
          specifier === "zod" ||
          specifier.startsWith(".") ||
          specifier.startsWith("..");
        expect(isAllowed).toBe(true);
      }
    }
  });
});
