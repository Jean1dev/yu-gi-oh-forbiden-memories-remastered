import type { CardNumber, DeckDraftViolation } from "@yugioh/shared";

/**
 * Maps each `DeckDraftViolation` variant to the exact player-facing text the
 * PRD spells out (build-deck PRD §6 F06 Capabilities: "faltam K cartas para
 * 40", "excedem K cartas acima de 40", "carta X com 4+ cópias", "carta X
 * além do que possui"). Kept separate from `messages.ts` (build-deck/F04):
 * that file maps a fixed code to a fixed string, while every message here
 * interpolates numbers and, for the two per-card variants, a resolved card
 * name (spec build-deck/F06 Decision 8).
 *
 * `findCardName` is typically `(cardNumber) => catalog(cardNumber)?.nome`;
 * when it returns `undefined` the card's own number stands in for the name
 * — the same fallback build-deck/F01 already applies to an unknown card.
 */
export function formatViolation(
  violation: DeckDraftViolation,
  findCardName: (cardNumber: CardNumber) => string | undefined,
): string {
  switch (violation.type) {
    case "insufficient_total":
      return `Faltam ${String(violation.missing)} cartas para 40`;
    case "excessive_total":
      return `Excedem ${String(violation.excess)} cartas acima de 40`;
    case "copy_limit_exceeded": {
      const label = findCardName(violation.cardNumber) ?? violation.cardNumber;
      return `${label}: ${String(violation.quantityInDraft)} cópias (máx. 3)`;
    }
    case "exceeds_owned_quantity": {
      const label = findCardName(violation.cardNumber) ?? violation.cardNumber;
      return `${label}: além do que possui (${String(violation.quantityOwned)})`;
    }
  }
}
