import {
  CANONICAL_CARD_TOTAL,
  CARD_NUMBER_LENGTH,
  type Card,
  type CardNumber,
  type ValidationViolation,
} from "@yugioh/shared";

function toCardNumber(value: number): CardNumber {
  return String(value).padStart(CARD_NUMBER_LENGTH, "0");
}

/**
 * Asserts the canonical shape of the collection: exactly 722 cards covering
 * `001`..`722` with no hole.
 *
 * This is the check that blocks the inflated 821 count the PRD calls out: 821
 * counts source files, 722 counts cards, and only the second one may ever reach
 * a consumer.
 *
 * A gap and a wrong total are reported independently, because a dataset can
 * hold 722 records and still miss a number when one is duplicated.
 */
export function checkCountAndContiguity(cards: readonly Card[]): readonly ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (cards.length !== CANONICAL_CARD_TOTAL) {
    violations.push({
      category: "contagem",
      code: "invalid_card_count",
      message: `Dataset has ${String(cards.length)} cards (expected ${String(CANONICAL_CARD_TOTAL)}) — check the ingestion.`,
    });
  }

  const present = new Set(cards.map((card) => card.numero));
  for (let current = 1; current <= CANONICAL_CARD_TOTAL; current += 1) {
    const numero = toCardNumber(current);
    if (!present.has(numero)) {
      violations.push({
        category: "contagem",
        numero,
        code: "missing_numero",
        message: `Numero ${numero} is missing from the dataset.`,
      });
    }
  }

  return violations;
}
