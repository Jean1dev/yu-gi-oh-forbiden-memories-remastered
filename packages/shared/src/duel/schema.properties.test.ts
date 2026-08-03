import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Card } from "../card/types.ts";
import { MonsterZoneSchema, PlayerFieldSchema } from "./schema.ts";
import type { MonsterPosition } from "./types.ts";

const emptyZone = { occupied: false } as const;

function validCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 999999,
    tipo: "monstro",
    ...overrides,
  };
}

const positions: readonly MonsterPosition[] = [
  "attack_face_up",
  "attack_face_down",
  "defense_face_up",
  "defense_face_down",
];

describe("PlayerFieldSchema exactly-5-zones invariant", () => {
  it("accepts monsters only when there are exactly 5 zones, for any n in [0, 10]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        const field = {
          monsters: Array.from({ length: n }, () => emptyZone),
          spells: Array.from({ length: 5 }, () => emptyZone),
        };
        expect(PlayerFieldSchema.safeParse(field).success).toBe(n === 5);
      }),
      { numRuns: 1000 },
    );
  });

  it("accepts spells only when there are exactly 5 zones, for any n in [0, 10]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (n) => {
        const field = {
          monsters: Array.from({ length: 5 }, () => emptyZone),
          spells: Array.from({ length: n }, () => emptyZone),
        };
        expect(PlayerFieldSchema.safeParse(field).success).toBe(n === 5);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("MonsterZoneSchema acceptance of any valid canonical card", () => {
  it("any valid canonical card in any of the 4 positions always passes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999999 }),
        fc.integer({ min: 0, max: 999999 }),
        fc.integer({ min: 0, max: 999999 }),
        fc.constantFrom(...positions),
        fc.boolean(),
        fc.boolean(),
        (id, atk, def, position, hasAttacked, hasChangedPosition) => {
          const zone = {
            occupied: true,
            card: validCard({ id, atk, def }),
            position,
            hasAttacked,
            hasChangedPosition,
            equips: [],
          };
          expect(MonsterZoneSchema.safeParse(zone).success).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("MonsterZoneSchema base value preservation", () => {
  it("atk and def read back from the zone are always identical to the original value", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999 }),
        fc.integer({ min: 0, max: 999999 }),
        fc.constantFrom(...positions),
        (atk, def, position) => {
          const zone = {
            occupied: true,
            card: validCard({ atk, def }),
            position,
            hasAttacked: false,
            hasChangedPosition: false,
            equips: [],
          };
          const result = MonsterZoneSchema.parse(zone);
          if (!result.occupied) throw new Error("expected an occupied zone");

          expect(result.card.atk).toBe(atk);
          expect(result.card.def).toBe(def);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
