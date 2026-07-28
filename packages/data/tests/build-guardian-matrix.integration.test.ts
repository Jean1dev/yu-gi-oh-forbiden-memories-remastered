import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GUARDIAN_STARS } from "@yugioh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { GuardianCoverageReport, GuardianMatrixEntry } from "../src/guardian-stars/types.ts";
import { DEFAULT_OPTIONS, runBuildGuardianMatrix } from "../scripts/build-guardian-matrix.ts";
import { DEFAULT_OPTIONS as INGESTION_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";
import { DEFAULT_OPTIONS as VALIDATION_OPTIONS, runValidation } from "../scripts/validate-cards.ts";

/**
 * Runs the real Guardian Star matrix build against the real (seed) source and
 * the real catalog produced by F01/F02/F03. These are the acceptance tests for
 * the PRD F06 criteria that do not depend on the pending matrix values: the
 * used-Guardian-Star set and the coverage counts are the genuine ones the
 * 722-card dataset produces (docs/arquitetura.md §4.2).
 */

const EXPECTED_PAIRS_FOR_TEN_GUARDIANS = 100;

let workDir = "";
let catalogDir = "";

async function readCoverageReport(dir: string): Promise<GuardianCoverageReport> {
  return JSON.parse(
    await readFile(join(dir, "guardian-star-coverage-report.json"), "utf8"),
  ) as GuardianCoverageReport;
}

async function readMatrix(dir: string): Promise<readonly GuardianMatrixEntry[]> {
  return JSON.parse(
    await readFile(join(dir, "guardian-star-matrix.json"), "utf8"),
  ) as readonly GuardianMatrixEntry[];
}

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "yugioh-guardian-matrix-"));
  catalogDir = join(workDir, "generated");

  const ingestionExit = await runIngestion({ ...INGESTION_OPTIONS, outputDir: catalogDir });
  expect(ingestionExit).toBe(0);

  const validationExit = await runValidation({
    generatedDir: catalogDir,
    placeholderPath: VALIDATION_OPTIONS.placeholderPath,
  });
  expect(validationExit).toBe(0);
}, 60_000);

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("build real da matriz de guardioes", () => {
  it("aceita a fonte vazia hoje e emite matriz de tamanho zero", async () => {
    const outputDir = join(workDir, "empty-source-output");

    const exitCode = await runBuildGuardianMatrix({
      sourcePath: DEFAULT_OPTIONS.sourcePath,
      generatedCatalogDir: catalogDir,
      outputDir,
    });

    expect(exitCode).toBe(0);
    expect(await readMatrix(outputDir)).toEqual([]);
  });

  it("deriva os dez guardioes usados a partir do catalogo real", async () => {
    const outputDir = join(workDir, "used-guardians-output");

    await runBuildGuardianMatrix({
      sourcePath: DEFAULT_OPTIONS.sourcePath,
      generatedCatalogDir: catalogDir,
      outputDir,
    });

    const report = await readCoverageReport(outputDir);
    expect(report.usedGuardianStars).toEqual(GUARDIAN_STARS);
  });

  it("reporta cobertura incompleta com cem pares faltantes sobre a fonte vazia atual", async () => {
    const outputDir = join(workDir, "coverage-output");

    await runBuildGuardianMatrix({
      sourcePath: DEFAULT_OPTIONS.sourcePath,
      generatedCatalogDir: catalogDir,
      outputDir,
    });

    const report = await readCoverageReport(outputDir);
    expect(report.complete).toBe(false);
    expect(report.expectedPairs).toBe(EXPECTED_PAIRS_FOR_TEN_GUARDIANS);
    expect(report.coveredPairs).toBe(0);
    expect(report.missingPairs).toHaveLength(EXPECTED_PAIRS_FOR_TEN_GUARDIANS);
  });

  it("aborta sem escrever artefatos quando o arquivo fonte esta ausente", async () => {
    const outputDir = join(workDir, "missing-source-output");

    const exitCode = await runBuildGuardianMatrix({
      sourcePath: join(workDir, "does-not-exist.json"),
      generatedCatalogDir: catalogDir,
      outputDir,
    });

    expect(exitCode).toBe(1);
    await expect(readMatrix(outputDir)).rejects.toThrow();
  });

  it("aborta quando o catalogo real nao pode ser carregado", async () => {
    const outputDir = join(workDir, "missing-catalog-output");

    const exitCode = await runBuildGuardianMatrix({
      sourcePath: DEFAULT_OPTIONS.sourcePath,
      generatedCatalogDir: join(workDir, "no-catalog-here"),
      outputDir,
    });

    expect(exitCode).toBe(1);
    await expect(readMatrix(outputDir)).rejects.toThrow();
  });
});

/**
 * Static analysis, kept next to the integration tests it protects — same
 * pattern as F03's `catalog.integration.test.ts`: the boundary rules in
 * .dependency-cruiser.cjs cover imports, and these cover the two things a
 * config file cannot see.
 */
describe("guardian-stars boundaries", () => {
  const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
  const NOT_OUR_CODE = /node_modules|[/\\]generated[/\\]/;
  const GUARDIAN_STARS_CORE = join(import.meta.dirname, "..", "src", "guardian-stars");
  const PACKAGES_ROOT = join(import.meta.dirname, "..", "..");

  async function sourceFiles(directory: string): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true, recursive: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => join(entry.parentPath, entry.name))
      .filter((path) => !path.endsWith(".test.ts") && !NOT_OUR_CODE.test(path));
  }

  async function codeLines(path: string): Promise<readonly string[]> {
    const content = await readFile(path, "utf8");
    return content.split("\n").filter((line) => !COMMENT_LINE.test(line));
  }

  it("keeps the guardian-stars core free of filesystem and network access", async () => {
    const files = await sourceFiles(GUARDIAN_STARS_CORE);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      for (const line of await codeLines(file)) {
        expect(line).not.toMatch(/from "node:/);
        expect(line).not.toMatch(/\bfetch\s*\(/);
      }
    }
  });

  it("leaves the generated artifacts known only to the build script", async () => {
    const artifacts = ["guardian-star-matrix.json", "guardian-star-coverage-report.json"];
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
