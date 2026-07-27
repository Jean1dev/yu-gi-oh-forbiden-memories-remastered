import { describe, expect, it } from "vitest";

import { manifestFor, monsterCard } from "../../tests/fixtures/validation-datasets.ts";
import { checkArtCoverage } from "./check-art-coverage.ts";

const PLACEHOLDER_EXISTS = true;
const PLACEHOLDER_MISSING = false;

describe("checkArtCoverage", () => {
  it("accepts a card present in the manifest", () => {
    const cards = [monsterCard()];
    expect(checkArtCoverage(cards, manifestFor(cards), PLACEHOLDER_MISSING)).toEqual([]);
  });

  it("accepts a card absent from the manifest when the placeholder exists", () => {
    expect(checkArtCoverage([monsterCard()], {}, PLACEHOLDER_EXISTS)).toEqual([]);
  });

  it("rejects a card absent from the manifest when the placeholder does not exist", () => {
    expect(checkArtCoverage([monsterCard()], {}, PLACEHOLDER_MISSING)).toEqual([
      {
        category: "arte",
        numero: "001",
        code: "missing_art_without_placeholder",
        message: "Card 001: art missing and no placeholder available.",
      },
    ]);
  });

  it("reports only the cards actually missing from the manifest", () => {
    const covered = monsterCard({ numero: "001", id: 1 });
    const uncovered = monsterCard({ numero: "002", id: 2 });

    const violations = checkArtCoverage(
      [covered, uncovered],
      manifestFor([covered]),
      PLACEHOLDER_MISSING,
    );

    expect(violations.map((violation) => violation.numero)).toEqual(["002"]);
  });

  it("ignores art in the manifest with no card behind it", () => {
    const cards = [monsterCard({ numero: "001", id: 1 })];
    const manifest = { ...manifestFor(cards), "999": "cards-data/999.jpg" };

    expect(checkArtCoverage(cards, manifest, PLACEHOLDER_MISSING)).toEqual([]);
  });
});
