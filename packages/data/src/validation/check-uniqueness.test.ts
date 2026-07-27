import { CANONICAL_CARD_TOTAL } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  monsterCard,
  toCardNumber,
  validDataset,
} from "../../tests/fixtures/validation-datasets.ts";
import { checkUniqueness } from "./check-uniqueness.ts";

describe("checkUniqueness", () => {
  it("reports no violation when every numero is distinct", () => {
    expect(checkUniqueness(validDataset())).toEqual([]);
  });

  it("reports the duplicated numero once, naming it", () => {
    const violations = checkUniqueness([
      monsterCard({ numero: "001", id: 1 }),
      monsterCard({ numero: "002", id: 2 }),
      monsterCard({ numero: "001", id: 3, nome: "Impostor" }),
    ]);

    expect(violations).toEqual([
      {
        category: "unicidade",
        numero: "001",
        code: "duplicate_numero",
        message: "Numero 001 is duplicated — integrity is not guaranteed.",
      },
    ]);
  });

  it("reports one violation per duplicated numero, however many copies exist", () => {
    const violations = checkUniqueness([
      monsterCard({ numero: "001", id: 1 }),
      monsterCard({ numero: "001", id: 2 }),
      monsterCard({ numero: "001", id: 3 }),
      monsterCard({ numero: "002", id: 4 }),
      monsterCard({ numero: "002", id: 5 }),
    ]);

    expect(violations.map((violation) => violation.numero)).toEqual(["001", "002"]);
  });
});

describe("checkUniqueness properties", () => {
  it("reports exactly one violation per duplicated numero, wherever the copies land", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: CANONICAL_CARD_TOTAL }), {
          minLength: 1,
          maxLength: 6,
        }),
        fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 0, max: CANONICAL_CARD_TOTAL }),
        (duplicated, copyCounts, insertionSeed) => {
          const cards = [...validDataset()];
          duplicated.forEach((value, index) => {
            const copies = copyCounts[index % copyCounts.length] ?? 1;
            for (let copy = 0; copy < copies; copy += 1) {
              const at = (insertionSeed + index + copy) % (cards.length + 1);
              cards.splice(at, 0, monsterCard({ id: 10_000 + copy, numero: toCardNumber(value) }));
            }
          });

          const violations = checkUniqueness(cards);
          expect(violations.map((violation) => violation.numero)).toEqual(
            [...duplicated].map(toCardNumber).sort((left, right) => left.localeCompare(right)),
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
