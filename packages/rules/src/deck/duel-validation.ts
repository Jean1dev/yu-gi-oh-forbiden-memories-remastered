import {
  MAX_COPIES_PER_CARD,
  REQUIRED_DECK_SIZE,
  type CardCatalogLookup,
  type DeckComposition,
  type DeckVerdict,
  type DeckViolation,
} from "@yugioh/shared";

import { totalCards } from "./composition.ts";

export function validateDeckComposition(composition: DeckComposition): DeckVerdict {
  const total = totalCards(composition);
  const violations: DeckViolation[] = [];
  if (total < REQUIRED_DECK_SIZE) {
    violations.push({ type: "insufficient_size", total, missing: REQUIRED_DECK_SIZE - total });
  } else if (total > REQUIRED_DECK_SIZE) {
    violations.push({ type: "excessive_size", total, excess: total - REQUIRED_DECK_SIZE });
  }

  for (const cardNumber of Object.keys(composition).sort()) {
    const quantity = composition[cardNumber] ?? 0;
    if (!Number.isInteger(quantity) || quantity < 1) {
      violations.push({ type: "invalid_quantity", cardNumber, quantity });
    } else if (quantity > MAX_COPIES_PER_CARD) {
      violations.push({ type: "copies_exceeded", cardNumber, quantity });
    }
  }
  return violations.length === 0 ? { valid: true, total } : { valid: false, total, violations };
}

export function validateDeckForDuel(input: {
  composition: DeckComposition;
  catalog: CardCatalogLookup;
}): DeckVerdict {
  const structural = validateDeckComposition(input.composition);
  const violations = structural.valid ? [] : [...structural.violations];
  for (const cardNumber of Object.keys(input.composition).sort()) {
    if (input.catalog(cardNumber) === undefined) {
      violations.push({ type: "unknown_card", cardNumber });
    }
  }
  return violations.length === 0
    ? { valid: true, total: structural.total }
    : { valid: false, total: structural.total, violations };
}
