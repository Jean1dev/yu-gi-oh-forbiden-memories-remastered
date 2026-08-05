import type { CardNumber } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { checkCardFrameCoverage } from "./check-card-frame-coverage.ts";

const numbers = (...values: string[]): ReadonlySet<CardNumber> => new Set(values);

function report(
  overrides: Partial<Parameters<typeof checkCardFrameCoverage>[0]> = {},
) {
  return checkCardFrameCoverage({
    cardNumbers: ["001", "002", "003", "004"],
    enrichedNumbers: numbers(),
    validCropArtNumbers: numbers(),
    legacyArtNumbers: numbers(),
    ...overrides,
  });
}

describe("checkCardFrameCoverage", () => {
  it("classifies a card as migrated only with enrichment and valid crop art", () => {
    const result = report({
      enrichedNumbers: numbers("001"),
      validCropArtNumbers: numbers("001"),
    });

    expect(result.migrated).toEqual(["001"]);
  });

  it("classifies a pending card with old art as legacy fallback", () => {
    expect(report({ legacyArtNumbers: numbers("002") }).legacyFallback).toEqual(["002"]);
  });

  it("reports inconsistent when only half of CardFrame exists", () => {
    const result = report({
      enrichedNumbers: numbers("001"),
      validCropArtNumbers: numbers("002"),
      legacyArtNumbers: numbers("001", "002"),
    });

    expect(result.inconsistent).toEqual(["001", "002"]);
  });

  it("reports uncovered without CardFrame or legacy fallback", () => {
    expect(report().uncovered).toEqual(["001", "002", "003", "004"]);
  });

  it("authorizes removal only for migrated cards that still have old art", () => {
    const result = report({
      enrichedNumbers: numbers("001", "002"),
      validCropArtNumbers: numbers("001", "002"),
      legacyArtNumbers: numbers("001", "003", "004"),
    });

    expect(result.legacyFilesEligibleForRemoval).toEqual(["001"]);
    expect(result.legacyFallback).toEqual(["003", "004"]);
  });

  it("marks complete only when combined coverage includes every card", () => {
    const result = report({
      enrichedNumbers: numbers("001", "002"),
      validCropArtNumbers: numbers("001", "002"),
      legacyArtNumbers: numbers("003", "004"),
    });

    expect(result.complete).toBe(true);
    expect(result.migrated).toEqual(["001", "002"]);
    expect(result.legacyFallback).toEqual(["003", "004"]);
  });
});
