import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRoster, type RosterReport } from "../src/roster/index.ts";
import { DEFAULT_OPTIONS as CATALOG_OPTIONS, loadCatalogFromDisk } from "./load-catalog-from-disk.ts";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type RosterValidationOptions = Readonly<{
  rosterFile: string;
  generatedDir: string;
}>;

export const DEFAULT_ROSTER_OPTIONS: RosterValidationOptions = {
  rosterFile: resolve(PACKAGE_ROOT, "data", "roster.json"),
  generatedDir: CATALOG_OPTIONS.generatedDir,
};

function printReport(report: RosterReport): void {
  console.log(`Duelists declared:  ${String(report.declaredDuelists)}`);
  console.log(`Duelists available: ${String(report.availableDuelists)}`);
  console.log(`Duelists hidden:    ${String(report.hidden.length)}`);
  for (const hidden of report.hidden) {
    console.warn(`${hidden.code}: ${hidden.id ?? "<unknown>"}`);
  }
}

export async function runRosterValidation(
  options: RosterValidationOptions = DEFAULT_ROSTER_OPTIONS,
): Promise<number> {
  const catalogResult = await loadCatalogFromDisk({ generatedDir: options.generatedDir });
  if (!catalogResult.ok) {
    console.error(
      `Catalog unavailable (${catalogResult.error.code}): ${catalogResult.error.message}`,
    );
    return 1;
  }

  let rawRoster: string;
  try {
    rawRoster = await readFile(options.rosterFile, "utf8");
  } catch {
    console.error(`Roster file is unavailable: ${options.rosterFile}`);
    return 1;
  }

  const result = loadRoster(rawRoster, (cardNumber) =>
    catalogResult.value.getByNumero(cardNumber),
  );
  if (!result.ok) {
    console.error(`Roster invalid (${result.error.code}): ${result.error.message}`);
    return 1;
  }

  printReport(result.value.report);
  return result.value.report.valid ? 0 : 1;
}

const invokedPath = process.argv[1];
const isEntryPoint =
  invokedPath !== undefined && fileURLToPath(import.meta.url) === resolve(invokedPath);
if (isEntryPoint) {
  process.exitCode = await runRosterValidation();
}
