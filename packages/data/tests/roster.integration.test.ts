import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadCatalogFromDisk } from "../scripts/load-catalog-from-disk.ts";
import { runRosterValidation } from "../scripts/validate-roster.ts";
import { toDuelist } from "../scripts/build-roster.ts";
import { DuelistSourceSchema } from "../src/roster/duelist-source.ts";
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
      expect.arrayContaining([
        "forest-mage",
        "meadow-mage",
        "jono",
        "nitemare",
        "seto-3rd",
        "teana",
        "test-duelist",
      ]),
    );
    for (const duelist of result.value.duelists) {
      expect(duelist.deck).toHaveLength(40);
      expect(duelist.dropPool[0]?.cardNumbers.length).toBeGreaterThan(0);
    }
  });

  it.each(["teana", "jono", "nitemare", "forest-mage", "seto-3rd", "meadow-mage"])(
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

  it("preserves Seto 3rd's original pools and reproduces its committed deck", async () => {
    const source = DuelistSourceSchema.parse(
      JSON.parse(await readFile(resolve(PACKAGE_ROOT, "data/duelists/seto-3rd.json"), "utf8")),
    );
    expect(source).toMatchObject({
      id: "seto-3rd",
      name: "Seto 3rd",
      fmDuelistId: 36,
      handSize: 20,
      difficulty: "hard",
      deckSeed: 20260805,
    });
    // SHA-256 of JSON-serialized {cardNumber, weight} entries ordered by CardId,
    // independently queried from sg4e/YGOFM-gamedata, Duelist=36.
    const originalPools = [
      {
        entries: source.deckPool ?? [],
        count: 63,
        hash: "247f895aa1f61233e7af9367c41d4419a8214a488fd44376fd0f423fbc0f7b3f",
      },
      {
        entries: source.dropPools.find((pool) => pool.tier === "common")?.entries ?? [],
        count: 70,
        hash: "dc3c5387912b7956fd9c705fd5ad346a53d567d1f4337400945fc5fac9a93d3a",
      },
      {
        entries: source.dropPools.find((pool) => pool.tier === "sa-pow")?.entries ?? [],
        count: 83,
        hash: "63f69f257fc67da4a88085c4f14cd8d379eb764149620a41d06bf691d271ffa8",
      },
      {
        entries: source.dropPools.find((pool) => pool.tier === "sa-tec")?.entries ?? [],
        count: 99,
        hash: "e44599c38aaa7aab25aed217256333a3e79630044f53e622567e206102ccfe94",
      },
    ];
    for (const pool of originalPools) {
      expect(pool.entries).toHaveLength(pool.count);
      expect(pool.entries.reduce((total, entry) => total + entry.weight, 0)).toBe(2048);
      expect(createHash("sha256").update(JSON.stringify(pool.entries)).digest("hex")).toBe(
        pool.hash,
      );
    }
    const roster = await loadWithRealCatalog(ROSTER_FILE);
    expect(roster.ok).toBe(true);
    if (!roster.ok) return;
    const committed = roster.value.duelists.find((duelist) => duelist.id === source.id);
    expect(toDuelist(source)).toEqual({ ok: true, value: committed });
  });

  it("preserves Meadow Mage's original pools and reproduces its committed deck", async () => {
    const source = DuelistSourceSchema.parse(
      JSON.parse(await readFile(resolve(PACKAGE_ROOT, "data/duelists/meadow-mage.json"), "utf8")),
    );
    expect(source).toMatchObject({
      id: "meadow-mage",
      name: "Meadow Mage",
      fmDuelistId: 29,
      handSize: 14,
      difficulty: "medium",
      deckSeed: 20260805,
    });
    // SHA-256 of JSON-serialized {cardNumber, weight} entries ordered by CardId,
    // independently queried from sg4e/YGOFM-gamedata, Duelist=29.
    const originalPools = [
      {
        entries: source.deckPool ?? [],
        count: 70,
        hash: "4b270d7ae239addbe56e18033833f874c4393e1aab0e4c23259101a98d432378",
      },
      {
        entries: source.dropPools.find((pool) => pool.tier === "common")?.entries ?? [],
        count: 47,
        hash: "e352cd41199c3b9f9223820e8fff8f280bb2ee649b53216c66055d74bd5e7657",
      },
      {
        entries: source.dropPools.find((pool) => pool.tier === "sa-pow")?.entries ?? [],
        count: 52,
        hash: "903ba6ea6094f651160c56dcb97dd18cc53e98103ac9d7e0bdaedb1c29b4e1b4",
      },
      {
        entries: source.dropPools.find((pool) => pool.tier === "sa-tec")?.entries ?? [],
        count: 37,
        hash: "8aa4417531b627548d59ec00bae25d7f5b822ff6bc3292b8f0782b0f2870f232",
      },
    ];
    for (const pool of originalPools) {
      expect(pool.entries).toHaveLength(pool.count);
      expect(pool.entries.reduce((total, entry) => total + entry.weight, 0)).toBe(2048);
      expect(createHash("sha256").update(JSON.stringify(pool.entries)).digest("hex")).toBe(
        pool.hash,
      );
    }
    const roster = await loadWithRealCatalog(ROSTER_FILE);
    expect(roster.ok).toBe(true);
    if (!roster.ok) return;
    const committed = roster.value.duelists.find((duelist) => duelist.id === source.id);
    expect(toDuelist(source)).toEqual({ ok: true, value: committed });
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
