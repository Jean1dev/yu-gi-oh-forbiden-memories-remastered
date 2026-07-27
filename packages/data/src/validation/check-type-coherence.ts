import type { Card, ValidationViolation } from "@yugioh/shared";

/** The four fields only a monster is allowed to carry. */
const MONSTER_FIELDS = ["atk", "def", "guardiao1", "guardiao2"] as const;

function filledFields(card: Card): readonly string[] {
  return MONSTER_FIELDS.filter((field) => card[field] !== null);
}

/**
 * Checks the fields a card is allowed to carry, in both directions.
 *
 * `monstro` must carry `atk`, `def` and both Guardian Stars; **every other
 * type, `ritual` included**, must carry none of them. That splits from the PRD
 * wording, which grouped `ritual` with `monstro`: the 24 rituals in the real
 * source have all four fields empty, so the PRD rule would reject the actual
 * dataset (spec F02, Decision 1).
 *
 * The reverse direction blocks too (spec F02, Decision 4): a trap that somehow
 * arrived with an ATK is as broken as a monster without one, and letting it
 * through would put a phantom stat in front of the duel engine.
 *
 * One violation per card, not per field — the card is what needs fixing.
 */
export function checkTypeCoherence(cards: readonly Card[]): readonly ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  for (const card of cards) {
    const filled = filledFields(card);

    if (card.tipo === "monstro") {
      if (filled.length !== MONSTER_FIELDS.length) {
        violations.push({
          category: "coerencia",
          numero: card.numero,
          code: "incomplete_monster_stats",
          message: `Card ${card.numero}: tipo monstro without atk/def or guardian stars.`,
        });
      }
      continue;
    }

    if (filled.length > 0) {
      violations.push({
        category: "coerencia",
        numero: card.numero,
        code: "non_monster_with_stats",
        message: `Card ${card.numero}: tipo ${card.tipo} should not carry atk/def/guardian stars (${filled.join(", ")}).`,
      });
    }
  }

  return violations;
}
