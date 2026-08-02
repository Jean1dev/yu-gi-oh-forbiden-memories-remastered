import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadCatalogFromDisk } from "../scripts/load-catalog-from-disk.ts";
import { runRosterValidation } from "../scripts/validate-roster.ts";
import { loadRoster } from "../src/roster/index.ts";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_DIR = resolve(PACKAGE_ROOT, "generated");
const ROSTER_FILE = resolve(PACKAGE_ROOT, "data", "roster.json");
const VALID_FIXTURE = resolve(PACKAGE_ROOT, "tests", "fixtures", "roster", "valid.json");

async function loadWithRealCatalog(file: string) {
  const catalog = await loadCatalogFromDisk({ generatedDir: GENERATED_DIR });
  if (!catalog.ok) throw catalog.error;
  return loadRoster(await readFile(file, "utf8"), (number) => catalog.value.getByNumero(number));
}

describe("roster integration", () => {
  it("loads the repository roster with the committed test duelist", async () => {
    const result = await loadWithRealCatalog(ROSTER_FILE);
    expect(result).toMatchObject({
      ok: true,
      value: {
        duelists: [{ id: "test-duelist", deck: expect.any(Array), dropPool: expect.any(Array) }],
        report: { valid: true, availableDuelists: 1, hidden: [] },
      },
    });
    if (result.ok) {
      expect(result.value.duelists[0]?.deck).toHaveLength(40);
      expect(result.value.duelists[0]?.dropPool[0]?.cardNumbers.length).toBeGreaterThan(0);
    }
  });

  it("accepts a fixture whose cards exist in the canonical catalog", async () => {
    const result = await loadWithRealCatalog(VALID_FIXTURE);
    expect(result).toMatchObject({
      ok: true,
      value: { duelists: [{ id: "fixture-duelist" }], report: { valid: true } },
    });
  });

  it("returns zero from the build adapter for the repository roster", async () => {
    await expect(
      runRosterValidation({ rosterFile: ROSTER_FILE, generatedDir: GENERATED_DIR }),
    ).resolves.toBe(0);
  });
});
