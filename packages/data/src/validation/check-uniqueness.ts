import type { Card, CardNumber, ValidationViolation } from "@yugioh/shared";

/**
 * Reports every `numero` claimed by more than one record.
 *
 * Exactly one violation per duplicated number, however many copies exist: the
 * report names the broken identity, not each repetition of it.
 *
 * Numbers are reported in ascending order so the report does not depend on the
 * order the records happened to arrive in.
 */
export function checkUniqueness(cards: readonly Card[]): readonly ValidationViolation[] {
  const seen = new Set<CardNumber>();
  const duplicated = new Set<CardNumber>();

  for (const card of cards) {
    if (seen.has(card.numero)) {
      duplicated.add(card.numero);
      continue;
    }
    seen.add(card.numero);
  }

  return [...duplicated]
    .sort((left, right) => left.localeCompare(right))
    .map((numero) => ({
      category: "unicidade" as const,
      numero,
      code: "duplicate_numero",
      message: `Numero ${numero} is duplicated — integrity is not guaranteed.`,
    }));
}
