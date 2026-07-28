import { CANONICAL_CARD_TOTAL, type CardNumber } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  datasetWithout,
  monsterCard,
  toCardNumber,
  validDataset,
} from "../../tests/fixtures/validation-datasets.ts";
import { checkCountAndContiguity } from "./check-count.ts";

describe("checkCountAndContiguity", () => {
  it("reports no violation for 722 contiguous cards", () => {
    expect(checkCountAndContiguity(validDataset())).toEqual([]);
  });

  it("reports a violation when the total differs from 722", () => {
    const violations = checkCountAndContiguity(datasetWithout(["722"]));
    expect(violations[0]).toEqual({
      category: "contagem",
      code: "invalid_card_count",
      message: "Dataset has 721 cards (expected 722) — check the ingestion.",
    });
  });

  it("reports one missing_numero violation per hole in the range", () => {
    const violations = checkCountAndContiguity(datasetWithout(["005", "300"]));
    const gaps = violations.filter((violation) => violation.code === "missing_numero");
    expect(gaps).toEqual([
      {
        category: "contagem",
        numero: "005",
        code: "missing_numero",
        message: "Numero 005 is missing from the dataset.",
      },
      {
        category: "contagem",
        numero: "300",
        code: "missing_numero",
        message: "Numero 300 is missing from the dataset.",
      },
    ]);
  });

  it("reports a hole even when the total is right, because a number is duplicated", () => {
    const cards = [...datasetWithout(["010"]), monsterCard({ id: 9, numero: "009" })];
    const violations = checkCountAndContiguity(cards);
    expect(violations.map((violation) => violation.code)).toEqual(["missing_numero"]);
    expect(violations[0]?.numero).toBe("010");
  });

  it("reports the inflated 821 count as a wrong total", () => {
    const inflated = [
      ...validDataset(),
      ...Array.from({ length: 99 }, (_unused, index) =>
        monsterCard({ id: 1000 + index, numero: toCardNumber(723 + index) }),
      ),
    ];
    const violations = checkCountAndContiguity(inflated);
    expect(violations).toEqual([
      {
        category: "contagem",
        code: "invalid_card_count",
        message: "Dataset has 821 cards (expected 722) — check the ingestion.",
      },
    ]);
  });
});

describe("checkCountAndContiguity properties", () => {
  it("reports exactly the removed numbers as gaps, for any removed subset", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: CANONICAL_CARD_TOTAL }), { maxLength: 8 }),
        (removed) => {
          const missing: readonly CardNumber[] = removed.map(toCardNumber);
          const violations = checkCountAndContiguity(datasetWithout(missing));
          const gaps = violations
            .filter((violation) => violation.code === "missing_numero")
            .map((violation) => violation.numero);

          expect(gaps).toEqual([...missing].sort((left, right) => left.localeCompare(right)));
          expect(gaps.length > 0).toBe(missing.length > 0);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
