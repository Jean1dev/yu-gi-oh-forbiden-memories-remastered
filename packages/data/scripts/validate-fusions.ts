import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { FusionReport } from "../src/fusion/types.ts";
import { DEFAULT_OPTIONS as CATALOG_OPTIONS, loadCatalogFromDisk } from "./load-catalog-from-disk.ts";
import {
  DEFAULT_OPTIONS as FUSION_OPTIONS,
  loadFusionTableFromDisk,
} from "./load-fusion-table-from-disk.ts";

/**
 * The maintainer-facing CLI for the fusion table: loads the catalog (F03),
 * loads and validates the fusion recipes against it, prints a summary and
 * sets the exit code — same shape as `validate-cards.ts` and
 * `ingest-cards.ts`.
 */

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

function printSummary(report: FusionReport): void {
  console.log(`Recipes in file:       ${String(report.totalInFile)}`);
  console.log(`Recipes indexed:       ${String(report.validRecipes)}`);
  console.log(`Recipes rejected:      ${String(report.rejectedRecipes.length)}`);

  for (const rejection of report.rejectedRecipes) {
    console.warn(`${rejection.reason}: ${rejection.detail}`);
  }

  console.log(
    report.rejectedRecipes.length === 0
      ? "Fusion table valid: every recipe in the file was indexed."
      : "Fusion table has rejected recipes: see the warnings above and fusion-validation-report.json.",
  );
}

export async function runFusionValidation(): Promise<number> {
  const catalogResult = await loadCatalogFromDisk(CATALOG_OPTIONS);
  if (!catalogResult.ok) {
    console.error(
      `Catalog unavailable (${catalogResult.error.code}): ${catalogResult.error.message}`,
    );
    return EXIT_FAILURE;
  }

  const fusionResult = await loadFusionTableFromDisk({
    ...FUSION_OPTIONS,
    catalog: catalogResult.value,
  });
  if (!fusionResult.ok) {
    console.error(
      `Fusion table aborted (${fusionResult.error.code}): ${fusionResult.error.message}`,
    );
    return EXIT_FAILURE;
  }

  printSummary(fusionResult.value.report);
  return fusionResult.value.report.rejectedRecipes.length === 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runFusionValidation();
}
