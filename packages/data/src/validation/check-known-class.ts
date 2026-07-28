import { KNOWN_CLASSES, type Card, type ValidationViolation } from "@yugioh/shared";

export type KnownClassResult = Readonly<{
  violations: readonly ValidationViolation[];
  /** Distinct classes outside the known set, sorted. */
  unknownClasses: readonly string[];
}>;

const KNOWN = new Set<string>(KNOWN_CLASSES);

/**
 * Flags every `classe` outside the 24 observed in the source.
 *
 * `classe` is a free string in the canonical schema (spec F01, Decision 8), so
 * this is the only place drift is caught: a renamed or misspelled class in a
 * future build of the source would otherwise flow through untouched. It blocks
 * rather than warns — the PRD left the choice open and the spec fixed it
 * (spec F02, Decision 2).
 *
 * The distinct list travels next to the violations because the report exposes
 * it as its own field, and recovering it from message text would be worse.
 */
export function checkKnownClass(cards: readonly Card[]): KnownClassResult {
  const violations: ValidationViolation[] = [];
  const unknownClasses = new Set<string>();

  for (const card of cards) {
    if (KNOWN.has(card.classe)) {
      continue;
    }
    unknownClasses.add(card.classe);
    violations.push({
      category: "classe",
      numero: card.numero,
      code: "unknown_class",
      message: `Card ${card.numero}: classe '${card.classe}' is outside the known set.`,
    });
  }

  return {
    violations,
    unknownClasses: [...unknownClasses].sort((left, right) => left.localeCompare(right)),
  };
}
