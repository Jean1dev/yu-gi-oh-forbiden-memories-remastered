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
  it("loads every committed duelist against the real catalog", async () => {
    const result = await loadWithRealCatalog(ROSTER_FILE);
    expect(result).toMatchObject({ ok: true, value: { report: { valid: true, hidden: [] } } });
    if (!result.ok) return;

    // Not an exact list: the roster grows by dropping a source file into
    // `data/duelists/`, and a new duelist must not fail this test.
    expect(result.value.duelists.map((duelist) => duelist.id)).toEqual(
      expect.arrayContaining(["jono", "teana", "test-duelist"]),
    );
    for (const duelist of result.value.duelists) {
      expect(duelist.deck).toHaveLength(40);
      expect(duelist.dropPool[0]?.cardNumbers.length).toBeGreaterThan(0);
    }
  });

  it.each(["teana", "jono"])(
    "derives a legal deck for the duelist ported from the original game (%s)",
    async (duelistId) => {
      const result = await loadWithRealCatalog(ROSTER_FILE);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const duelist = result.value.duelists.find((candidate) => candidate.id === duelistId);
      expect(duelist).toBeDefined();
      const copies = new Map<string, number>();
      for (const cardNumber of duelist?.deck ?? []) {
        copies.set(cardNumber, (copies.get(cardNumber) ?? 0) + 1);
      }
      expect(Math.max(...copies.values())).toBeLessThanOrEqual(3);
      // The three FM drop pools, mapped onto our tiers by `build-roster`.
      expect(duelist?.dropPool.map((tier) => tier.tier)).toEqual(["common", "sa-pow", "sa-tec"]);
    },
  );

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
