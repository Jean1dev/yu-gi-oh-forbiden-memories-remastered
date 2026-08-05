import { VIOLATION_CATEGORIES, type Card } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  manifestFor,
  monsterCard,
  rawDataset,
  validDataset,
} from "../../tests/fixtures/validation-datasets.ts";
import { validateDataset } from "./validate-dataset.ts";

const GENERATED_AT = "2026-07-27T12:05:00.000Z";

function validate(cards: readonly Card[], placeholderExists = false) {
  return validateDataset({
    rawCards: rawDataset(cards),
    manifest: manifestFor(cards),
    placeholderExists,
    generatedAt: GENERATED_AT,
  });
}

describe("validateDataset", () => {
  it("seals the dataset as valid when no violation occurs", () => {
    const { report, seal } = validate(validDataset());

    expect(report.valid).toBe(true);
    expect(report.violations).toEqual([]);
    expect(report.totalValidated).toBe(722);
    expect(seal).toEqual({ valid: true, generatedAt: GENERATED_AT });
  });

  it("refuses the seal when any category holds a violation", () => {
    const cards = [
      ...validDataset().slice(0, 721),
      monsterCard({ id: 722, numero: "722", atk: null }),
    ];
    const { report, seal } = validate(cards);

    expect(report.valid).toBe(false);
    expect(seal.valid).toBe(false);
    expect(report.violationsByCategory.coerencia).toBe(1);
  });

  it("fills all seven violationsByCategory keys even when they are zero", () => {
    const { report } = validate(validDataset());

    expect(Object.keys(report.violationsByCategory).sort()).toEqual(
      [...VIOLATION_CATEGORIES].sort(),
    );
    expect(Object.values(report.violationsByCategory)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("aggregates violations from several categories in one run", () => {
    const cards = [
      ...validDataset().slice(0, 720),
      monsterCard({ id: 721, numero: "721", classe: "Draggon" }),
      monsterCard({ id: 722, numero: "722", def: null }),
      monsterCard({ id: 723, numero: "721", nome: "Impostor" }),
    ];
    const { report } = validate(cards);

    expect(report.violationsByCategory).toEqual({
      contagem: 1,
      unicidade: 1,
      tipo: 0,
      classe: 1,
      coerencia: 1,
      password: 0,
      arte: 0,
    });
    expect(report.unknownClasses).toEqual(["Draggon"]);
    expect(report.valid).toBe(false);
  });

  it("keeps a record that fails the reparse out of totalValidated", () => {
    const raw = [...(rawDataset(validDataset()) as unknown[]), { nome: "not a card" }];
    const { report } = validateDataset({
      rawCards: raw,
      manifest: manifestFor(validDataset()),
      placeholderExists: true,
      generatedAt: GENERATED_AT,
    });

    expect(report.totalValidated).toBe(722);
    expect(report.violations.map((violation) => violation.code)).toEqual([
      "invalid_canonical_schema",
    ]);
  });

  it("orders violations by the order the checks run", () => {
    const cards = [
      ...validDataset().slice(0, 721),
      monsterCard({ id: 722, numero: "722", classe: "Draggon", atk: null }),
    ];
    const { report } = validate(cards);

    expect(report.violations.map((violation) => violation.category)).toEqual([
      "classe",
      "coerencia",
    ]);
  });

  it("reports missing art when no placeholder exists on disk", () => {
    const cards = validDataset();
    const { report } = validateDataset({
      rawCards: rawDataset(cards),
      manifest: {},
      placeholderExists: false,
      generatedAt: GENERATED_AT,
    });

    expect(report.violationsByCategory.arte).toBe(722);
    expect(report.valid).toBe(false);
  });

  it("covers missing art with the placeholder when it exists on disk", () => {
    const cards = validDataset();
    const { report } = validateDataset({
      rawCards: rawDataset(cards),
      manifest: {},
      placeholderExists: true,
      generatedAt: GENERATED_AT,
    });

    expect(report.valid).toBe(true);
  });

  it("covers missing legacy art with enriched crop art", () => {
    const cards = validDataset().map((card) => ({ ...card, descricao: "Migrated" }));
    const { report } = validateDataset({
      rawCards: rawDataset(cards),
      manifest: {},
      cropManifest: manifestFor(cards),
      placeholderExists: false,
      generatedAt: GENERATED_AT,
    });

    expect(report.valid).toBe(true);
  });
});

describe("validateDataset properties", () => {
  it("produces the same violations on two runs over the same input", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 721 }), { maxLength: 5 }),
        (brokenIndexes) => {
          const cards = validDataset().map((card, index) =>
            brokenIndexes.includes(index) ? { ...card, atk: null } : card,
          );
          const input = {
            rawCards: rawDataset(cards),
            manifest: manifestFor(cards),
            placeholderExists: false,
            generatedAt: GENERATED_AT,
          };

          const first = validateDataset(input);
          const second = validateDataset(input);

          expect(second.report.violations).toEqual(first.report.violations);
          expect(second.seal.valid).toBe(brokenIndexes.length === 0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
