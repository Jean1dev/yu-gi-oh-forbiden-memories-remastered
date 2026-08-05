import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CANONICAL_CARD_TOTAL,
  DatasetSealSchema,
  VIOLATION_CATEGORIES,
  ValidationReportSchema,
  type Card,
  type ValidationReport,
} from "@yugioh/shared";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { DEFAULT_OPTIONS as INGESTION_OPTIONS, runIngestion } from "../scripts/ingest-cards.ts";
import { DEFAULT_OPTIONS as VALIDATION_OPTIONS, runValidation } from "../scripts/validate-cards.ts";

/**
 * Runs the real integrity gate over the real output of the real ingestion.
 * These are the acceptance tests for the PRD F02 criteria: the tampered
 * datasets are built from the genuine one, so a defect is the only difference.
 */

type ValidationRun = Readonly<{
  exitCode: number;
  report: ValidationReport;
  seal: { valid: boolean; generatedAt: string };
}>;

/** A path that does not exist, so the placeholder reads as the pending asset it is. */
const MISSING_PLACEHOLDER = join(tmpdir(), "yugioh-placeholder-that-does-not-exist.jpg");

let workDir = "";
let ingestedDir = "";

async function validateIn(generatedDir: string, placeholderPath: string): Promise<ValidationRun> {
  const exitCode = await runValidation({ generatedDir, placeholderPath });
  const report = ValidationReportSchema.parse(
    JSON.parse(await readFile(join(generatedDir, "validation-report.json"), "utf8")),
  );
  const seal = DatasetSealSchema.parse(
    JSON.parse(await readFile(join(generatedDir, "dataset-seal.json"), "utf8")),
  );
  return { exitCode, report, seal };
}

/**
 * Copies the ingestion artifacts alone. Any seal left by an earlier run is
 * dropped, so a test that asserts nothing was written cannot pass on a stale
 * file it inherited.
 */
async function freshCopy(name: string): Promise<string> {
  const target = join(workDir, name);
  await cp(ingestedDir, target, { recursive: true });
  await rm(join(target, "validation-report.json"), { force: true });
  await rm(join(target, "dataset-seal.json"), { force: true });
  return target;
}

/** Copies the genuine artifacts and rewrites `cards.json` by hand, as a maintainer could. */
async function tamperedCopy(name: string, tamper: (cards: Card[]) => unknown): Promise<string> {
  const target = await freshCopy(name);

  const cards = JSON.parse(await readFile(join(target, "cards.json"), "utf8")) as Card[];
  await writeFile(join(target, "cards.json"), JSON.stringify(tamper(cards)), "utf8");
  return target;
}

beforeAll(async () => {
  // Both adapters are expected to print; the assertions read the artifacts.
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  workDir = await mkdtemp(join(tmpdir(), "yugioh-validate-"));
  ingestedDir = join(workDir, "ingested");

  const ingestionExitCode = await runIngestion({ ...INGESTION_OPTIONS, outputDir: ingestedDir });
  expect(ingestionExitCode).toBe(0);
}, 60_000);

afterAll(async () => {
  vi.restoreAllMocks();
  if (workDir !== "") {
    await rm(workDir, { recursive: true, force: true });
  }
});

describe("real validation", () => {
  it("approves the dataset produced by the real ingestion", async () => {
    const run = await validateIn(ingestedDir, MISSING_PLACEHOLDER);

    expect(run.report.violations).toEqual([]);
    expect(run.report.valid).toBe(true);
    expect(run.seal.valid).toBe(true);
    expect(run.exitCode).toBe(0);
  }, 60_000);

  it("validates exactly the canonical 722 cards, never the inflated 821", async () => {
    const run = await validateIn(ingestedDir, MISSING_PLACEHOLDER);

    expect(run.report.totalValidated).toBe(CANONICAL_CARD_TOTAL);
    expect(run.report.totalValidated).toBe(722);
  }, 60_000);

  it("reports every violation category at zero on the real dataset", async () => {
    const run = await validateIn(ingestedDir, MISSING_PLACEHOLDER);

    expect(Object.keys(run.report.violationsByCategory).sort()).toEqual(
      [...VIOLATION_CATEGORIES].sort(),
    );
    for (const category of VIOLATION_CATEGORIES) {
      expect(run.report.violationsByCategory[category]).toBe(0);
    }
    expect(run.report.unknownClasses).toEqual([]);
  }, 60_000);

  it("keeps the default placeholder path pointing at the pending asset", async () => {
    // The real dataset covers 722/722 arts, so the missing placeholder file
    // cannot invalidate it today (spec F02, Decision 5).
    const run = await validateIn(ingestedDir, VALIDATION_OPTIONS.placeholderPath);
    expect(run.report.violationsByCategory.arte).toBe(0);
  }, 60_000);
});

describe("real validation on a tampered catalog", () => {
  it("detects an unknown classe hand-edited into cards.json", async () => {
    const target = await tamperedCopy("unknown-class", (cards) =>
      cards.map((card, index) => (index === 0 ? { ...card, classe: "Draggon" } : card)),
    );
    const run = await validateIn(target, MISSING_PLACEHOLDER);

    expect(run.report.violationsByCategory.classe).toBe(1);
    expect(run.report.unknownClasses).toEqual(["Draggon"]);
    expect(run.seal.valid).toBe(false);
    expect(run.exitCode).not.toBe(0);
  }, 60_000);

  it("detects a duplicated numero hand-edited into cards.json", async () => {
    const target = await tamperedCopy("duplicate-numero", (cards) =>
      cards.map((card, index) => (index === 1 ? { ...card, numero: "001" } : card)),
    );
    const run = await validateIn(target, MISSING_PLACEHOLDER);

    expect(run.report.violationsByCategory.unicidade).toBe(1);
    expect(run.report.violations.some((violation) => violation.code === "duplicate_numero")).toBe(
      true,
    );
    expect(run.seal.valid).toBe(false);
  }, 60_000);

  it("detects a tipo outside the enum, naming the offending card", async () => {
    const target = await tamperedCopy("invalid-tipo", (cards) =>
      cards.map((card, index) => (index === 0 ? { ...card, tipo: "feitico" } : card)),
    );
    const run = await validateIn(target, MISSING_PLACEHOLDER);

    const violation = run.report.violations.find(
      (candidate) => candidate.code === "invalid_card_type",
    );
    expect(violation?.numero).toBe("001");
    expect(violation?.message).toContain("001");
    expect(run.seal.valid).toBe(false);
  }, 60_000);

  it("detects a monster stripped of its atk as a coherence violation", async () => {
    const target = await tamperedCopy("incoherent-monster", (cards) =>
      cards.map((card, index) => (index === 0 ? { ...card, atk: null } : card)),
    );
    const run = await validateIn(target, MISSING_PLACEHOLDER);

    expect(run.report.violationsByCategory.coerencia).toBe(1);
    expect(run.seal.valid).toBe(false);
  }, 60_000);

  it("detects a truncated catalog as a wrong count with the missing numbers listed", async () => {
    const target = await tamperedCopy("truncated", (cards) => cards.slice(0, 700));
    const run = await validateIn(target, MISSING_PLACEHOLDER);

    expect(run.report.totalValidated).toBe(700);
    expect(run.report.violationsByCategory.contagem).toBe(23);
    expect(run.seal.valid).toBe(false);
  }, 60_000);

  it("refuses the seal when a card has no art and the default placeholder is absent", async () => {
    const target = await freshCopy("missing-art");

    const manifest = JSON.parse(
      await readFile(join(target, "arts-manifest.json"), "utf8"),
    ) as Record<string, string>;
    delete manifest["001"];
    await writeFile(join(target, "arts-manifest.json"), JSON.stringify(manifest), "utf8");
    const cropManifest = JSON.parse(
      await readFile(join(target, "crop-arts-manifest.json"), "utf8"),
    ) as Record<string, string>;
    delete cropManifest["001"];
    await writeFile(
      join(target, "crop-arts-manifest.json"),
      JSON.stringify(cropManifest),
      "utf8",
    );

    const run = await validateIn(target, MISSING_PLACEHOLDER);

    expect(run.report.violationsByCategory.arte).toBe(1);
    expect(run.report.violations.at(-1)?.code).toBe("missing_art_without_placeholder");
    expect(run.seal.valid).toBe(false);
  }, 60_000);

  it("covers the same missing art once the placeholder exists on disk", async () => {
    const target = await freshCopy("missing-art-with-placeholder");

    const manifest = JSON.parse(
      await readFile(join(target, "arts-manifest.json"), "utf8"),
    ) as Record<string, string>;
    delete manifest["001"];
    await writeFile(join(target, "arts-manifest.json"), JSON.stringify(manifest), "utf8");

    const placeholder = join(workDir, "placeholder.jpg");
    await writeFile(placeholder, "not really an image", "utf8");

    const run = await validateIn(target, placeholder);

    expect(run.report.violationsByCategory.arte).toBe(0);
    expect(run.seal.valid).toBe(true);
    expect(run.exitCode).toBe(0);
  }, 60_000);
});

describe("real validation preconditions", () => {
  it("aborts without writing any artifact when cards.json does not exist", async () => {
    const target = join(workDir, "empty-dir");
    const exitCode = await runValidation({
      generatedDir: target,
      placeholderPath: MISSING_PLACEHOLDER,
    });

    expect(exitCode).not.toBe(0);
    await expect(readdir(target)).rejects.toThrow();
  });

  it("aborts when arts-manifest.json is missing, without sealing the dataset", async () => {
    const target = await freshCopy("no-manifest");
    await rm(join(target, "arts-manifest.json"));

    const exitCode = await runValidation({
      generatedDir: target,
      placeholderPath: MISSING_PLACEHOLDER,
    });

    expect(exitCode).not.toBe(0);
    await expect(readFile(join(target, "dataset-seal.json"), "utf8")).rejects.toThrow();
  });

  it("aborts when cards.json is not valid JSON", async () => {
    const target = await freshCopy("malformed");
    await writeFile(join(target, "cards.json"), '[{"numero":"001",', "utf8");

    const exitCode = await runValidation({
      generatedDir: target,
      placeholderPath: MISSING_PLACEHOLDER,
    });

    expect(exitCode).not.toBe(0);
    await expect(readFile(join(target, "dataset-seal.json"), "utf8")).rejects.toThrow();
  });
});
