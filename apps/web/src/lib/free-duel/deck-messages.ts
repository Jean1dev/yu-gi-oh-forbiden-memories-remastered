import type { DeckViolation } from "@yugioh/shared";

export const MISSING_DECK_MESSAGE =
  "Você ainda não tem um deck pronto. Monte seu deck no Build Deck.";
export const INVALID_DECK_MESSAGE =
  "Seu deck está inválido (precisa de 40 cartas, máx. 3 cópias). Ajuste no Build Deck.";
export const LOAD_FAILED_MESSAGE = "Não foi possível carregar seu deck agora. Tente novamente.";

export function formatDeckViolation(violation: DeckViolation): string {
  switch (violation.type) {
    case "insufficient_size":
      return `${String(violation.missing)} cards missing.`;
    case "excessive_size":
      return `${String(violation.excess)} cards over the limit.`;
    case "copies_exceeded":
      return `${violation.cardNumber}: ${String(violation.quantity)} copies.`;
    case "invalid_quantity":
      return `${violation.cardNumber}: invalid quantity.`;
    case "unknown_card":
      return `${violation.cardNumber}: card not found.`;
  }
}
