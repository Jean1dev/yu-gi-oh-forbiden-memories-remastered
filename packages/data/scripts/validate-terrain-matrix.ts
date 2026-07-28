import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { TerrainClassCoverageReport } from "../src/terrain/types.ts";
import { DEFAULT_OPTIONS as CATALOG_OPTIONS, loadCatalogFromDisk } from "./load-catalog-from-disk.ts";
import {
  DEFAULT_OPTIONS as TERRAIN_OPTIONS,
  loadTerrainTableFromDisk,
} from "./load-terrain-table-from-disk.ts";

/**
 * The maintainer-facing CLI for the terrain↔class matrix: loads the catalog
 * (F03), loads and validates the matrix against it, prints a summary and
 * sets the exit code — same shape as `validate-fusions.ts` and
 * `build-guardian-matrix.ts`.
 *
 * Only structural/duplicate/contradiction/reference violations fail the exit
 * code. Incomplete coverage never does — the matrix embarks empty today, and
 * that is pending external data, not a defect of this run (spec F07,
 * Decision 6/9).
 */

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

export type ValidateTerrainMatrixOptions = Readonly<{
  caminhoArquivo: string;
  generatedCatalogDir: string;
}>;

export const DEFAULT_VALIDATION_OPTIONS: ValidateTerrainMatrixOptions = {
  caminhoArquivo: TERRAIN_OPTIONS.filePath,
  generatedCatalogDir: CATALOG_OPTIONS.generatedDir,
};

function printSummary(terrenosCarregados: number, report: TerrainClassCoverageReport): void {
  console.log(`Terrenos carregados:   ${String(terrenosCarregados)}`);
  console.log(`Classes conhecidas:    ${String(report.totalKnownClasses)}`);
  console.log(`Classes cobertas:      ${String(report.totalCoveredClasses)}`);
  console.log(`Classes sem cobertura: ${String(report.classesWithoutCoverage.length)}`);

  for (const classe of report.classesWithoutCoverage) {
    console.warn(`Classe sem cobertura: ${classe}`);
  }

  console.log(
    report.classesWithoutCoverage.length === 0
      ? "Terrain class matrix coverage complete."
      : "Terrain class matrix coverage incomplete: see the warnings above (pending external data).",
  );
}

export async function runTerrainMatrixValidation(
  options: ValidateTerrainMatrixOptions = DEFAULT_VALIDATION_OPTIONS,
): Promise<number> {
  const catalogResult = await loadCatalogFromDisk({ generatedDir: options.generatedCatalogDir });
  if (!catalogResult.ok) {
    console.error(
      `Catalog unavailable (${catalogResult.error.code}): ${catalogResult.error.message}`,
    );
    return EXIT_FAILURE;
  }

  const terrainResult = await loadTerrainTableFromDisk({
    filePath: options.caminhoArquivo,
    catalog: catalogResult.value,
  });
  if (!terrainResult.ok) {
    console.error(
      `Terrain class matrix aborted (${terrainResult.error.code}): ${terrainResult.error.message}`,
    );
    return EXIT_FAILURE;
  }

  printSummary(terrainResult.value.table.listTerrenos().length, terrainResult.value.coverageReport);
  return EXIT_SUCCESS;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runTerrainMatrixValidation();
}
