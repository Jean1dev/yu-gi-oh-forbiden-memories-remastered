import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CardSchema, GUARDIAN_STARS, type Card } from "@yugioh/shared";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { DEFAULT_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";

/**
 * Runs the real ingestion against the real `cards-data/` source. These are the
 * acceptance tests for the PRD criteria: the numbers asserted here are the ones
 * verified in the spec, not guesses.
 */

type Artifacts = Readonly<{
  exitCode: number;
  cards: readonly Card[];
  manifest: Readonly<Record<string, string>>;
  report: {
    filesRead: number;
    discardedByError: number;
    discardedAsInvalid: readonly unknown[];
    cardsEmitted: number;
    missingNumbers: readonly string[];
    artsFound: number;
    missingArts: readonly string[];
    orphanArts: readonly string[];
    observedClasses: readonly string[];
    observedTypes: Record<string, number>;
    complete: boolean;
  };
  cardsJson: string;
  artManifestJson: string;
  coverage: {
    totalCards: number;
    migrated: readonly string[];
    legacyFallback: readonly string[];
    inconsistent: readonly string[];
    uncovered: readonly string[];
    complete: boolean;
  };
}>;

async function ingestInto(outputDir: string): Promise<Artifacts> {
  const exitCode = await runIngestion({ ...DEFAULT_OPTIONS, outputDir });
  const cardsJson = await readFile(join(outputDir, "cards.json"), "utf8");
  const artManifestJson = await readFile(join(outputDir, "arts-manifest.json"), "utf8");
  const reportJson = await readFile(join(outputDir, "ingestion-report.json"), "utf8");
  const coverageJson = await readFile(
    join(outputDir, "card-frame-coverage-report.json"),
    "utf8",
  );
  return {
    exitCode,
    cards: JSON.parse(cardsJson) as Card[],
    manifest: JSON.parse(artManifestJson) as Record<string, string>,
    report: JSON.parse(reportJson) as Artifacts["report"],
    cardsJson,
    artManifestJson,
    coverage: JSON.parse(coverageJson) as Artifacts["coverage"],
  };
}

let workDir = "";
let artifacts: Artifacts;

beforeAll(async () => {
  // The adapter is expected to print its summary; the assertions read the
  // artifacts, so the noise adds nothing to the test output.
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  workDir = await mkdtemp(join(tmpdir(), "yugioh-ingest-"));
  artifacts = await ingestInto(join(workDir, "run-1"));
}, 60_000);

afterAll(async () => {
  vi.restoreAllMocks();
  if (workDir !== "") {
    await rm(workDir, { recursive: true, force: true });
  }
});

describe("real ingestion", () => {
  it("reads 821 files and discards 99 error envelopes", () => {
    expect(artifacts.report.filesRead).toBe(821);
    expect(artifacts.report.discardedByError).toBe(99);
    expect(artifacts.report.discardedAsInvalid).toEqual([]);
  });

  it("emits exactly 722 cards", () => {
    expect(artifacts.report.cardsEmitted).toBe(722);
    expect(artifacts.cards).toHaveLength(722);
  });

  it("emits numero 001 through 722, contiguous and ordered", () => {
    const expected = Array.from({ length: 722 }, (_unused, index) =>
      String(index + 1).padStart(3, "0"),
    );
    expect(artifacts.cards.map((card) => card.numero)).toEqual(expected);
    expect(artifacts.report.missingNumbers).toEqual([]);
  });

  it("emits no duplicate numero", () => {
    const numbers = artifacts.cards.map((card) => card.numero);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("emits every card in the canonical 15-field schema", () => {
    for (const card of artifacts.cards) {
      const parsed = CardSchema.safeParse(card);
      if (!parsed.success) {
        throw new Error(`card ${card.numero} is not canonical: ${parsed.error.message}`);
      }
      expect(Object.keys(card)).toHaveLength(15);
    }
  });

  it("observes exactly 24 distinct classes", () => {
    expect(artifacts.report.observedClasses).toHaveLength(24);
  });

  it("observes only guardian stars from the known set of ten", () => {
    const observed = new Set<string>();
    for (const card of artifacts.cards) {
      if (card.guardiao1 !== null) observed.add(card.guardiao1);
      if (card.guardiao2 !== null) observed.add(card.guardiao2);
    }
    expect(observed.size).toBe(10);
    expect([...observed].sort()).toEqual([...GUARDIAN_STARS].sort());
  });

  it("distributes the types as 621 monstro, 24 ritual, 34 equipamento, 33 magica, 10 armadilha", () => {
    expect(artifacts.report.observedTypes).toEqual({
      monstro: 621,
      ritual: 24,
      equipamento: 34,
      magica: 33,
      armadilha: 10,
    });
  });

  it("resolves every card through combined crop or legacy coverage", () => {
    expect(artifacts.report.artsFound).toBe(artifacts.coverage.legacyFallback.length);
    expect(artifacts.report.orphanArts).toEqual([]);
    expect(Object.keys(artifacts.manifest)).toHaveLength(artifacts.coverage.legacyFallback.length);
    expect(artifacts.manifest["356"]).toBe(join("cards-data", "356.jpg"));
  });

  it("normalizes the 24 cards without a password to null password and null estrelas", () => {
    const withoutPassword = artifacts.cards.filter((card) => card.password === null);
    expect(withoutPassword).toHaveLength(24);
    for (const card of withoutPassword) {
      expect(card.estrelas).toBeNull();
    }
    expect(artifacts.cardsJson).not.toContain("Indispon");
  });

  it("normalizes the 24 rituals with null atk, def and guardian stars", () => {
    const rituals = artifacts.cards.filter((card) => card.tipo === "ritual");
    expect(rituals).toHaveLength(24);
    for (const ritual of rituals) {
      expect(ritual.atk).toBeNull();
      expect(ritual.def).toBeNull();
      expect(ritual.guardiao1).toBeNull();
      expect(ritual.guardiao2).toBeNull();
    }
  });

  it("finishes complete with exit code zero", () => {
    expect(artifacts.report.complete).toBe(true);
    expect(artifacts.exitCode).toBe(0);
  });

  it("reports combined CardFrame and legacy coverage for all 722 cards", () => {
    expect(artifacts.coverage.totalCards).toBe(722);
    expect(artifacts.coverage.inconsistent).toEqual([]);
    expect(artifacts.coverage.uncovered).toEqual([]);
    expect(
      artifacts.coverage.migrated.length + artifacts.coverage.legacyFallback.length,
    ).toBe(722);
    expect(artifacts.coverage.complete).toBe(true);
  });

  it("produces identical bytes across two consecutive runs", async () => {
    const second = await ingestInto(join(workDir, "run-2"));
    expect(second.cardsJson).toBe(artifacts.cardsJson);
    expect(second.artManifestJson).toBe(artifacts.artManifestJson);
  }, 60_000);
});

describe("real ingestion error handling", () => {
  it("aborts without writing any artifact when the source directory is missing", async () => {
    const outputDir = join(workDir, "aborted");
    const exitCode = await runIngestion({
      ...DEFAULT_OPTIONS,
      sourceDir: join(workDir, "does-not-exist"),
      outputDir,
    });

    expect(exitCode).not.toBe(0);
    await expect(readdir(outputDir)).rejects.toThrow();
  });
});
