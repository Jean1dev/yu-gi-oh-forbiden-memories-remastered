import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { resolveCombatTable } from "./resolve-combat-table.ts";

const atkDefArbitrary = fc.record({
  atk: fc.integer({ min: 0, max: 5000 }),
  def: fc.integer({ min: 0, max: 5000 }),
});

describe("resolveCombatTable properties", () => {
  it("cobertura exaustiva: nunca produz dano negativo nem destrói os dois lados fora do empate ATK vs ATK", () => {
    fc.assert(
      fc.property(
        atkDefArbitrary,
        fc.option(atkDefArbitrary, { nil: undefined }),
        fc.constantFrom<"attack" | "defense" | undefined>("attack", "defense", undefined),
        (attackerEffective, defenderEffective, positionChoice) => {
          const defenderPosition = defenderEffective === undefined ? undefined : positionChoice;

          const result = resolveCombatTable({ attackerEffective, defenderEffective, defenderPosition });

          expect(result.damage.toAttackerOwner).toBeGreaterThanOrEqual(0);
          expect(result.damage.toDefenderOwner).toBeGreaterThanOrEqual(0);
          expect(result.damage.toAttackerOwner === 0 || result.damage.toDefenderOwner === 0).toBe(true);

          if (result.attackerDestroyed && result.defenderDestroyed) {
            expect(defenderPosition).toBe("attack");
            expect(defenderEffective?.atk).toBe(attackerEffective.atk);
          }

          if (defenderEffective === undefined) {
            expect(result.attackerDestroyed).toBe(false);
            expect(result.defenderDestroyed).toBe(false);
            expect(result.damage).toEqual({ toAttackerOwner: 0, toDefenderOwner: attackerEffective.atk });
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
