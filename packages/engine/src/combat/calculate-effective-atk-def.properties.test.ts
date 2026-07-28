import { CARD_TYPES, GUARDIAN_STARS, type Card } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  calculateEffectiveAtkDef,
  type CombatContext,
  type ModifierProviders,
} from "./calculate-effective-atk-def.ts";

const neutralProviders: ModifierProviders = {
  guardian: () => ({ atk: 0, def: 0 }),
  terrain: () => ({ atk: 0, def: 0 }),
  equipment: () => ({ atk: 0, def: 0 }),
};

const cardArbitrary: fc.Arbitrary<Card> = fc.record({
  id: fc.integer({ min: 1, max: 722 }),
  numero: fc.integer({ min: 1, max: 722 }).map((n) => String(n).padStart(3, "0")),
  nome: fc.string({ minLength: 1, maxLength: 20 }),
  img: fc.constant(null),
  classe: fc.constantFrom("Dragon", "Warrior", "Magic", "Trap"),
  atk: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: null }),
  def: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: null }),
  guardiao1: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  guardiao2: fc.option(fc.constantFrom(...GUARDIAN_STARS), { nil: null }),
  password: fc.constant(null),
  estrelas: fc.constant(null),
  tipo: fc.constantFrom(...CARD_TYPES),
});

/**
 * `opponent` may be entirely absent — not `undefined` — from the generated
 * object (`requiredKeys` excludes it), matching `CombatContext`'s optional
 * key under `exactOptionalPropertyTypes`.
 */
const contextArbitrary: fc.Arbitrary<CombatContext> = fc.record(
  {
    activeField: fc.option(cardArbitrary, { nil: null }),
    opponent: fc.option(cardArbitrary, { nil: null }),
  },
  { requiredKeys: ["activeField"] },
);

const deltaArbitrary = fc.record({
  atk: fc.integer({ min: -500, max: 500 }),
  def: fc.integer({ min: -500, max: 500 }),
});

describe("neutrality preserves the base (motor-duelo-1x1/F04, critério de aceite 2)", () => {
  it("always returns exactly the card's base atk/def when every provider is neutral", () => {
    fc.assert(
      fc.property(cardArbitrary, contextArbitrary, (monster, context) => {
        const result = calculateEffectiveAtkDef(monster, context, neutralProviders);
        expect(result).toEqual({ atk: monster.atk ?? 0, def: monster.def ?? 0 });
      }),
      { numRuns: 1000 },
    );
  });
});

describe("additive composition (motor-duelo-1x1/F04, critério de aceite 1)", () => {
  it("always equals the base plus the exact sum of the three provider deltas", () => {
    fc.assert(
      fc.property(
        cardArbitrary,
        contextArbitrary,
        deltaArbitrary,
        deltaArbitrary,
        deltaArbitrary,
        (monster, context, guardianDelta, terrainDelta, equipmentDelta) => {
          const providers: ModifierProviders = {
            guardian: () => guardianDelta,
            terrain: () => terrainDelta,
            equipment: () => equipmentDelta,
          };

          const result = calculateEffectiveAtkDef(monster, context, providers);

          expect(result).toEqual({
            atk: (monster.atk ?? 0) + guardianDelta.atk + terrainDelta.atk + equipmentDelta.atk,
            def: (monster.def ?? 0) + guardianDelta.def + terrainDelta.def + equipmentDelta.def,
          });
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("purity", () => {
  it("leaves the monster and context objects structurally unchanged", () => {
    fc.assert(
      fc.property(
        cardArbitrary,
        contextArbitrary,
        deltaArbitrary,
        deltaArbitrary,
        deltaArbitrary,
        (monster, context, guardianDelta, terrainDelta, equipmentDelta) => {
          const monsterSnapshot = JSON.parse(JSON.stringify(monster)) as Card;
          const contextSnapshot = JSON.parse(JSON.stringify(context)) as CombatContext;
          const providers: ModifierProviders = {
            guardian: () => guardianDelta,
            terrain: () => terrainDelta,
            equipment: () => equipmentDelta,
          };

          calculateEffectiveAtkDef(monster, context, providers);

          expect(monster).toEqual(monsterSnapshot);
          expect(context).toEqual(contextSnapshot);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
