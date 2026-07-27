import {
  CANONICAL_CARD_TOTAL,
  CARD_NUMBER_LENGTH,
  DomainError,
  err,
  ok,
  type Card,
  type CardNumber,
  type Result,
} from "@yugioh/shared";

/**
 * A normalized card paired with the file it came from. The file name is not
 * part of the card contract, but a collision report is useless without it.
 */
export type CandidateCard = Readonly<{
  card: Card;
  file: string;
}>;

export type CardAggregation = Readonly<{
  /** Sorted by `numero` ascending, no duplicates. */
  cards: readonly Card[];
  /** Numbers missing from the scanned range, ascending. */
  missingNumbers: readonly CardNumber[];
}>;

function toCardNumber(value: number): CardNumber {
  return String(value).padStart(CARD_NUMBER_LENGTH, "0");
}

/**
 * Lists the numbers absent from `001` up to the end of the scanned range.
 *
 * The upper bound is the highest emitted number *or* the canonical total,
 * whichever is larger, so a truncated tail and a future larger dataset are both
 * covered without hard-coding 722 as an assertion (spec F01, Decision 9 — the
 * assertion itself belongs to F02).
 */
function findMissingNumbers(emitted: ReadonlySet<CardNumber>): readonly CardNumber[] {
  let highest = 0;
  for (const numero of emitted) {
    highest = Math.max(highest, Number(numero));
  }

  const upperBound = Math.max(highest, CANONICAL_CARD_TOTAL);
  const missing: CardNumber[] = [];
  for (let current = 1; current <= upperBound; current += 1) {
    const numero = toCardNumber(current);
    if (!emitted.has(numero)) {
      missing.push(numero);
    }
  }
  return missing;
}

/**
 * Groups the surviving records by `numero`, aborting on a collision between two
 * valid records, then sorts the dataset and reports the gaps.
 *
 * A collision aborts because it means the source is ambiguous about a card's
 * identity, and picking a winner silently would bake that ambiguity into every
 * downstream consumer. A gap does not abort: it feeds `missingNumbers` so F02
 * can rule on the dataset as a whole.
 */
export function aggregateCards(
  candidates: readonly CandidateCard[],
): Result<CardAggregation, DomainError> {
  const byNumber = new Map<CardNumber, CandidateCard>();

  for (const candidate of candidates) {
    const { numero } = candidate.card;
    const existing = byNumber.get(numero);
    if (existing !== undefined) {
      return err(
        new DomainError(
          `numero collision on ${numero} between ${existing.file} and ${candidate.file}`,
          "card_number_collision",
          { numero, fileA: existing.file, fileB: candidate.file },
        ),
      );
    }
    byNumber.set(numero, candidate);
  }

  // Card numbers are fixed-width and zero-padded, so lexicographic order and
  // numeric order coincide.
  const cards = [...byNumber.values()]
    .map((candidate) => candidate.card)
    .sort((left, right) => left.numero.localeCompare(right.numero));

  return ok({
    cards,
    missingNumbers: findMissingNumbers(new Set(byNumber.keys())),
  });
}
