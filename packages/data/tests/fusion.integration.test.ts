import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CardCatalog } from "../src/catalog/types.ts";
import { DEFAULT_OPTIONS as INGESTION_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";
import { loadCatalogFromDisk } from "../scripts/load-catalog-from-disk.ts";
import {
  DEFAULT_OPTIONS as FUSION_OPTIONS,
  loadFusionTableFromDisk,
} from "../scripts/load-fusion-table-from-disk.ts";
import { DEFAULT_OPTIONS as VALIDATION_OPTIONS, runValidation } from "../scripts/validate-cards.ts";

/**
 * Runs the fusion table over the real catalog built from the real ingestion
 * and the real integrity gate (F01+F02+F03), and over the real seed
 * `rules-data/fusions.json`. These are the acceptance tests for the PRD F05
 * criteria — including the neutral-path test that stands in for the
 * (pending) fidelity criterion while no real recipe values exist yet
 * (spec F05, Decision 10).
 */

let workDir = "";
let sealedDir = "";
let catalog: CardCatalog;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-fusion-"));
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

describe("fusion table over the real seed", () => {
  it("loads the generated official recipes without rejections", async () => {
    const reportDir = join(workDir, "official-seed-report");
    const result = await loadFusionTableFromDisk({
      filePath: FUSION_OPTIONS.filePath,
      catalog,
      reportDir,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.table.listAllRecipes().length).toBeGreaterThan(0);
    expect(result.value.report.totalInFile).toBeGreaterThan(0);
    expect(result.value.report.rejectedRecipes).toEqual([]);
  });

  it("finds an official fusion independently of material order", async () => {
    const reportDir = join(workDir, "official-seed-report-materials");
    const result = await loadFusionTableFromDisk({
      filePath: FUSION_OPTIONS.filePath,
      catalog,
      reportDir,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.table.findByMaterialPair("002", "008")?.result).toBe("638");
    expect(result.value.table.findByMaterialPair("008", "002")?.result).toBe("638");
  });

  it("returns undefined from findByClassPair because the official seed uses material pairs", async () => {
    const reportDir = join(workDir, "official-seed-report-classes");
    const result = await loadFusionTableFromDisk({
      filePath: FUSION_OPTIONS.filePath,
      catalog,
      reportDir,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.table.findByClassPair("Dragon", "Warrior")).toBeUndefined();
  });
});

describe("fusion table over synthetic recipes against the real catalog", () => {
  async function loadWithFile(
    recipes: readonly unknown[],
  ): ReturnType<typeof loadFusionTableFromDisk> {
    const filePath = join(workDir, `synthetic-${String(Math.random())}.json`);
    await writeFile(filePath, JSON.stringify(recipes), "utf8");
    return loadFusionTableFromDisk({
      filePath,
      catalog,
      reportDir: join(workDir, "synthetic-report"),
    });
  }

  it("rejects a synthetic recipe whose material numero does not exist in the real catalog", async () => {
    const result = await loadWithFile([
      { kind: "materials", materials: ["001", "999"], result: "003" },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.report.rejectedRecipes).toEqual([
      {
        index: 0,
        reason: "unknown_material_number",
        detail: "Recipe 0: material '999' does not exist in the catalog.",
      },
    ]);
  });

  it("rejects a synthetic recipe whose classe does not exist in the real catalog", async () => {
    const result = await loadWithFile([
      { kind: "classes", classes: ["Dragon", "NoSuchClass"], result: "003" },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.report.rejectedRecipes).toEqual([
      {
        index: 0,
        reason: "unknown_class",
        detail: "Recipe 0: classe 'NoSuchClass' does not exist in the catalog.",
      },
    ]);
  });

  it("approves and indexes a synthetic recipe whose numero and classe exist in the real catalog", async () => {
    const first = catalog.listByTipo("monstro")[0];
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }

    const result = await loadWithFile([
      { kind: "materials", materials: ["001", "002"], result: first.numero },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.report.rejectedRecipes).toEqual([]);
    expect(result.value.table.findByMaterialPair("001", "002")?.result).toBe(first.numero);
  });

  it("writes fusion-validation-report.json with the expected rejections", async () => {
    const reportDir = join(workDir, "written-report");
    const filePath = join(workDir, "written-report-source.json");
    await writeFile(
      filePath,
      JSON.stringify([{ kind: "materials", materials: ["001", "999"], result: "003" }]),
      "utf8",
    );

    const result = await loadFusionTableFromDisk({ filePath, catalog, reportDir });
    expect(result.ok).toBe(true);

    const reportContent = await readFile(join(reportDir, "fusion-validation-report.json"), "utf8");
    const report = JSON.parse(reportContent) as { rejectedRecipes: unknown };
    expect(report.rejectedRecipes).toEqual([
      {
        index: 0,
        reason: "unknown_material_number",
        detail: "Recipe 0: material '999' does not exist in the catalog.",
      },
    ]);
  });
});

/**
 * Static analysis, kept next to the integration tests it protects — same
 * pattern as `catalog.integration.test.ts` and `art.integration.test.ts`.
 */
describe("fusion boundaries", () => {
  const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
  const FUSION_CORE = join(import.meta.dirname, "..", "src", "fusion");

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

  it("keeps the fusion core free of filesystem, process and network access", async () => {
    const files = await sourceFiles(FUSION_CORE);
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
    const files = await sourceFiles(FUSION_CORE);

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
