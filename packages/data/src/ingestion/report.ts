import { CARD_TYPES, type Card, type CardNumber, type CardType } from "@yugioh/shared";

/** One record the ingestion refused to emit, with the reason it was refused. */
export type DiscardedRecord = Readonly<{
  file: string;
  reason: string;
  code: string;
}>;

/**
 * Process evidence consumed by F02 and by the maintainer.
 *
 * This is deliberately not embedded in `cards.json`: the domain dataset stays
 * free of process metadata (spec F01, Decision 6).
 */
export type IngestionReport = Readonly<{
  /** Total files scanned in the source directory (821 in the current source). */
  filesRead: number;
  /** `success:false` envelopes — the expected path, 99 in the current source. */
  discardedByError: number;
  discardedAsInvalid: readonly DiscardedRecord[];
  cardsEmitted: number;
  missingNumbers: readonly CardNumber[];
  artsFound: number;
  missingArts: readonly CardNumber[];
  orphanArts: readonly string[];
  /**
   * Distinct classes observed in the emitted dataset. Input for F02, never a
   * hard-coded list (spec F01, Decision 8).
   */
  observedClasses: readonly string[];
  observedTypes: Readonly<Record<CardType, number>>;
  /** `true` only when nothing is missing and nothing was discarded as invalid. */
  complete: boolean;
  /** ISO 8601. The only non-deterministic field (spec F01, Decision 12). */
  generatedAt: string;
}>;

export type IngestionReportInput = Readonly<{
  filesRead: number;
  discardedByError: number;
  discardedAsInvalid: readonly DiscardedRecord[];
  cards: readonly Card[];
  missingNumbers: readonly CardNumber[];
  artsFound: number;
  missingArts: readonly CardNumber[];
  orphanArts: readonly string[];
  generatedAt: string;
}>;

function collectObservedClasses(cards: readonly Card[]): readonly string[] {
  const classes = new Set(cards.map((card) => card.classe));
  return [...classes].sort((left, right) => left.localeCompare(right));
}

/** Counts every known type, so an absent type reads as `0` rather than missing. */
function countObservedTypes(cards: readonly Card[]): Readonly<Record<CardType, number>> {
  const counts = Object.fromEntries(CARD_TYPES.map((type) => [type, 0])) as Record<
    CardType,
    number
  >;
  for (const card of cards) {
    counts[card.tipo] += 1;
  }
  return counts;
}

/**
 * Assembles the ingestion report.
 *
 * `generatedAt` is injected rather than read from the clock, keeping this
 * function pure and the report reproducible in tests
 * (TypeScript-development-guidelines.md §12.3).
 */
export function buildIngestionReport(input: IngestionReportInput): IngestionReport {
  return {
    filesRead: input.filesRead,
    discardedByError: input.discardedByError,
    discardedAsInvalid: input.discardedAsInvalid,
    cardsEmitted: input.cards.length,
    missingNumbers: input.missingNumbers,
    artsFound: input.artsFound,
    missingArts: input.missingArts,
    orphanArts: input.orphanArts,
    observedClasses: collectObservedClasses(input.cards),
    observedTypes: countObservedTypes(input.cards),
    complete: input.missingNumbers.length === 0 && input.discardedAsInvalid.length === 0,
    generatedAt: input.generatedAt,
  };
}
