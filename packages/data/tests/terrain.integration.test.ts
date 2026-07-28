import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, beforeAll, afterAll } from "vitest";

import type { CardCatalog } from "../src/catalog/types.ts";
import { deriveKnownMonsterClasses } from "../src/terrain/derive-known-monster-classes.ts";
import { DEFAULT_OPTIONS as INGESTION_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";
import { loadCatalogFromDisk } from "../scripts/load-catalog-from-disk.ts";
import {
  DEFAULT_OPTIONS as TERRAIN_OPTIONS,
  loadTerrainTableFromDisk,
} from "../scripts/load-terrain-table-from-disk.ts";
import {
  DEFAULT_VALIDATION_OPTIONS,
  runTerrainMatrixValidation,
} from "../scripts/validate-terrain-matrix.ts";
import { DEFAULT_OPTIONS as VALIDATION_OPTIONS, runValidation } from "../scripts/validate-cards.ts";
import { unknownClassMatrixSource, validMatrixSource } from "./fixtures/terrain-datasets.ts";

/**
 * Runs the real terrain↔class table over the catalog built from the real
 * ingestion and integrity gate (F01+F02+F03), and over the real seed
 * `terrain-class-matrix.json`. These are the acceptance tests for the PRD F07
 * criteria that do not depend on the pending matrix values (spec F07,
 * Decision 9).
 */

let workDir = "";
let sealedDir = "";
let catalog: CardCatalog;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-terrain-"));
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

describe("terrain table over the real seed", () => {
  it("tabela real carrega o arquivo terrain-class-matrix.json vazio sem erro", async () => {
    const result = await loadTerrainTableFromDisk({ filePath: TERRAIN_OPTIONS.filePath, catalog });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.table.listTerrenos()).toEqual([]);
  });

  it("tabela real reporta 100% das classes de monstro do catalogo real como sem cobertura enquanto a matriz esta vazia", async () => {
    const result = await loadTerrainTableFromDisk({ filePath: TERRAIN_OPTIONS.filePath, catalog });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const knownClasses = deriveKnownMonsterClasses(catalog);
    expect(result.value.coverageReport.classesWithoutCoverage).toEqual(knownClasses);
    expect(result.value.coverageReport.totalCoveredClasses).toBe(0);
  });

  it("tabela real deriva classesDeMonstroConhecidas excluindo Equip Magic Ritual e Trap", () => {
    const knownClasses = deriveKnownMonsterClasses(catalog);

    expect(knownClasses).not.toContain("Equip");
    expect(knownClasses).not.toContain("Magic");
    expect(knownClasses).not.toContain("Ritual");
    expect(knownClasses).not.toContain("Trap");
    // As quatro pseudo-classes existem no catalogo real (F01 spec), so a
    // exclusao acima so prova algo se elas de fato aparecem em countByClasse.
    const allClasses = Object.keys(catalog.countByClasse());
    expect(allClasses).toEqual(expect.arrayContaining(["Equip", "Magic", "Ritual", "Trap"]));
  });

  it("tabela real nao bloqueia mesmo com cobertura zero", async () => {
    const result = await loadTerrainTableFromDisk({ filePath: TERRAIN_OPTIONS.filePath, catalog });

    expect(result.ok).toBe(true);
  });
});

describe("terrain table over synthetic matrix against the real catalog", () => {
  async function loadWithFile(raw: unknown): ReturnType<typeof loadTerrainTableFromDisk> {
    const filePath = join(workDir, `synthetic-${String(Math.random())}.json`);
    await writeFile(filePath, JSON.stringify(raw), "utf8");
    return loadTerrainTableFromDisk({ filePath, catalog });
  }

  it("rejeita quando a matriz sintetica referencia uma classe inexistente no catalogo real", async () => {
    const result = await loadWithFile(unknownClassMatrixSource());

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("terrain_matrix_invalid");
  });

  it("aceita e classifica uma matriz sintetica referenciando uma classe real do catalogo", async () => {
    const knownClasses = deriveKnownMonsterClasses(catalog);
    const monsterClasse = knownClasses[0];
    expect(monsterClasse).toBeDefined();
    if (monsterClasse === undefined) {
      return;
    }

    const result = await loadWithFile(validMatrixSource(monsterClasse));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.table.classifyClasseInTerreno("TerrenoExemploA", monsterClasse)).toEqual({
      tipo: "fortalecida",
      magnitude: 500,
    });
  });
});

describe("script real de validacao da matriz de terreno", () => {
  it("script de validacao real termina com exit code zero mesmo com cobertura incompleta", async () => {
    const exitCode = await runTerrainMatrixValidation({
      caminhoArquivo: TERRAIN_OPTIONS.filePath,
      generatedCatalogDir: sealedDir,
    });

    expect(exitCode).toBe(0);
  });

  it("script de validacao real termina com exit code diferente de zero quando a matriz de teste referencia classe inexistente", async () => {
    const filePath = join(workDir, "script-unknown-class.json");
    await writeFile(filePath, JSON.stringify(unknownClassMatrixSource()), "utf8");

    const exitCode = await runTerrainMatrixValidation({
      caminhoArquivo: filePath,
      generatedCatalogDir: sealedDir,
    });

    expect(exitCode).toBe(1);
  });

  it("script de validacao real termina com exit code diferente de zero quando o catalogo esta indisponivel", async () => {
    const exitCode = await runTerrainMatrixValidation({
      caminhoArquivo: TERRAIN_OPTIONS.filePath,
      generatedCatalogDir: join(workDir, "no-catalog-here"),
    });

    expect(exitCode).toBe(1);
  });

  it("usa a matriz vazia real por padrao quando nenhuma opcao e passada", () => {
    expect(DEFAULT_VALIDATION_OPTIONS.caminhoArquivo).toBe(TERRAIN_OPTIONS.filePath);
  });
});

/**
 * Static analysis, kept next to the integration tests it protects — same
 * pattern as `fusion.integration.test.ts` and `catalog.integration.test.ts`.
 */
describe("terrain boundaries", () => {
  const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
  const TERRAIN_CORE = join(import.meta.dirname, "..", "src", "terrain");

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

  it("keeps the terrain core free of filesystem, process and network access", async () => {
    const files = await sourceFiles(TERRAIN_CORE);
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
    const files = await sourceFiles(TERRAIN_CORE);

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
