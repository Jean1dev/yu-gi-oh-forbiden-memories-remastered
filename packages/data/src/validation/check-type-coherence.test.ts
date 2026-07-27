import type { Card, CardType, GuardianStar } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { monsterCard, nonMonsterCard } from "../../tests/fixtures/validation-datasets.ts";
import { checkTypeCoherence } from "./check-type-coherence.ts";

const NON_MONSTER_TYPES = ["armadilha", "equipamento", "magica", "ritual"] as const;

describe("checkTypeCoherence", () => {
  it("accepts a monstro with atk, def and both guardian stars filled", () => {
    expect(checkTypeCoherence([monsterCard()])).toEqual([]);
  });

  it("rejects a monstro without atk", () => {
    expect(checkTypeCoherence([monsterCard({ atk: null })])).toEqual([
      {
        category: "coerencia",
        numero: "001",
        code: "incomplete_monster_stats",
        message: "Card 001: tipo monstro without atk/def or guardian stars.",
      },
    ]);
  });

  it("rejects a monstro without guardiao2", () => {
    const violations = checkTypeCoherence([monsterCard({ guardiao2: null })]);
    expect(violations.map((violation) => violation.code)).toEqual(["incomplete_monster_stats"]);
  });

  it("accepts a ritual with empty atk, def and guardian stars", () => {
    expect(checkTypeCoherence([nonMonsterCard({ tipo: "ritual" })])).toEqual([]);
  });

  it("accepts armadilha, equipamento and magica with the four fields empty", () => {
    const cards = NON_MONSTER_TYPES.map((tipo, index) =>
      nonMonsterCard({ numero: `70${String(index)}`, id: index + 1, tipo }),
    );
    expect(checkTypeCoherence(cards)).toEqual([]);
  });

  it("rejects a non-monstro carrying an atk it should not have", () => {
    expect(checkTypeCoherence([nonMonsterCard({ atk: 1200 })])).toEqual([
      {
        category: "coerencia",
        numero: "700",
        code: "non_monster_with_stats",
        message: "Card 700: tipo magica should not carry atk/def/guardian stars (atk).",
      },
    ]);
  });

  it("rejects a ritual carrying guardian stars, the case the PRD wording would have allowed", () => {
    const violations = checkTypeCoherence([
      nonMonsterCard({ tipo: "ritual", guardiao1: "Sun", guardiao2: "Moon" }),
    ]);
    expect(violations.map((violation) => violation.code)).toEqual(["non_monster_with_stats"]);
  });

  it("reports one violation per broken card, not per broken field", () => {
    const violations = checkTypeCoherence([nonMonsterCard({ atk: 1200, def: 800 })]);
    expect(violations).toHaveLength(1);
  });
});

describe("checkTypeCoherence properties", () => {
  const nullableNumber = fc.option(fc.integer({ min: 0, max: 5000 }), { nil: null });
  const nullableGuardian = fc.option(fc.constantFrom<GuardianStar>("Sun", "Moon"), { nil: null });

  it("flags a non-monstro exactly when at least one monster-only field is filled", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<CardType>(...NON_MONSTER_TYPES),
        nullableNumber,
        nullableNumber,
        nullableGuardian,
        nullableGuardian,
        (tipo, atk, def, guardiao1, guardiao2) => {
          const card: Card = nonMonsterCard({ tipo, atk, def, guardiao1, guardiao2 });
          const violations = checkTypeCoherence([card]);
          const anyFilled = [atk, def, guardiao1, guardiao2].some((value) => value !== null);

          expect(violations.length === 1).toBe(anyFilled);
          if (anyFilled) {
            expect(violations[0]?.code).toBe("non_monster_with_stats");
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("flags a monstro exactly when at least one monster-only field is empty", () => {
    fc.assert(
      fc.property(
        nullableNumber,
        nullableNumber,
        nullableGuardian,
        nullableGuardian,
        (atk, def, guardiao1, guardiao2) => {
          const violations = checkTypeCoherence([monsterCard({ atk, def, guardiao1, guardiao2 })]);
          const anyEmpty = [atk, def, guardiao1, guardiao2].some((value) => value === null);

          expect(violations.length === 1).toBe(anyEmpty);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
