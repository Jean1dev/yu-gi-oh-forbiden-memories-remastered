import { CANONICAL_CARD_TOTAL, type Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { sourceCard } from "../../tests/fixtures/source-records.ts";
import { aggregateCards, type CandidateCard } from "./aggregate-cards.ts";
import { normalizeCard } from "./normalize-card.ts";

function candidate(numero: string, file = `${numero}.json`): CandidateCard {
  const result = normalizeCard(sourceCard({ id: Number(numero), numero }), file);
  if (!result.ok) {
    throw new Error(`fixture ${numero} is not a valid card: ${result.error.message}`);
  }
  return { card: result.value, file };
}

/** The full contiguous range, so gap assertions are not diluted by the tail. */
function fullRange(): CandidateCard[] {
  return Array.from({ length: CANONICAL_CARD_TOTAL }, (_unused, index) =>
    candidate(String(index + 1).padStart(3, "0")),
  );
}

function aggregateOrThrow(candidates: readonly CandidateCard[]) {
  const result = aggregateCards(candidates);
  if (!result.ok) {
    throw new Error(`expected aggregation to succeed, got ${result.error.code}`);
  }
  return result.value;
}

describe("aggregateCards", () => {
  it("sorts the dataset by numero ascending", () => {
    const { cards } = aggregateOrThrow([candidate("003"), candidate("001"), candidate("002")]);
    expect(cards.map((card: Card) => card.numero)).toEqual(["001", "002", "003"]);
  });

  it("aborts with card_number_collision when two valid records share a numero", () => {
    const result = aggregateCards([candidate("001", "001.json"), candidate("001", "01.json")]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("card_number_collision");
    expect(result.error.details).toMatchObject({
      numero: "001",
      fileA: "001.json",
      fileB: "01.json",
    });
  });

  it("reports a missing numero when there is a gap in the range", () => {
    const withGap = fullRange().filter((entry) => entry.card.numero !== "413");
    expect(aggregateOrThrow(withGap).missingNumbers).toEqual(["413"]);
  });

  it("reports no gap for a contiguous dataset", () => {
    expect(aggregateOrThrow(fullRange()).missingNumbers).toEqual([]);
  });

  it("scans up to CANONICAL_CARD_TOTAL when the highest emitted numero is lower", () => {
    const { missingNumbers } = aggregateOrThrow([candidate("001")]);
    expect(missingNumbers).toHaveLength(CANONICAL_CARD_TOTAL - 1);
    expect(missingNumbers.at(-1)).toBe("722");
  });

  it("scans past CANONICAL_CARD_TOTAL when the dataset grows beyond it", () => {
    const { missingNumbers } = aggregateOrThrow([candidate("001"), candidate("900")]);
    expect(missingNumbers).toContain("722");
    expect(missingNumbers).toContain("899");
    expect(missingNumbers).not.toContain("900");
  });

  it("reports exactly the complement of any emitted subset", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: CANONICAL_CARD_TOTAL }), {
          minLength: 1,
          maxLength: 40,
        }),
        (emittedNumbers) => {
          const emitted = new Set(emittedNumbers.map((n) => String(n).padStart(3, "0")));
          const { missingNumbers } = aggregateOrThrow([...emitted].map((n) => candidate(n)));

          const expected = Array.from({ length: CANONICAL_CARD_TOTAL }, (_unused, index) =>
            String(index + 1).padStart(3, "0"),
          ).filter((numero) => !emitted.has(numero));

          return JSON.stringify(missingNumbers) === JSON.stringify(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
