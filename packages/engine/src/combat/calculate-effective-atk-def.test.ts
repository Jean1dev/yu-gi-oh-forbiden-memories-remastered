import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { calculateEffectiveAtkDef, type ModifierProviders } from "./calculate-effective-atk-def.ts";

/**
 * Local stand-ins for the neutral providers `packages/rules` exports.
 * Duplicated rather than imported: `packages/engine` may only depend on
 * `packages/shared` (`.dependency-cruiser.cjs`, "engine-depends-only-on-shared"),
 * so this test builds its own trivial doubles instead of reaching into
 * `packages/rules`.
 */
const neutralProviders: ModifierProviders = {
  guardian: () => ({ atk: 0, def: 0 }),
  terrain: () => ({ atk: 0, def: 0 }),
  equipment: () => ({ atk: 0, def: 0 }),
};

function makeMonster(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Test Monster",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: null,
    estrelas: null,
    tipo: "monstro",
    ...overrides,
  };
}

const opponent = makeMonster({ numero: "002", guardiao1: "Moon", guardiao2: null });

describe("calculateEffectiveAtkDef", () => {
  it("returns the card's base atk/def when all providers are neutral", () => {
    const monster = makeMonster();

    const result = calculateEffectiveAtkDef(
      monster,
      { activeField: null, opponent: null },
      neutralProviders,
    );

    expect(result).toEqual({ atk: 3000, def: 2500 });
  });

  it("sums the deltas of the three providers onto the base", () => {
    const monster = makeMonster();
    const providers: ModifierProviders = {
      guardian: () => ({ atk: 100, def: 10 }),
      terrain: () => ({ atk: 20, def: 200 }),
      equipment: () => ({ atk: 5, def: 5 }),
    };

    const result = calculateEffectiveAtkDef(monster, { activeField: null }, providers);

    expect(result).toEqual({ atk: 3000 + 100 + 20 + 5, def: 2500 + 10 + 200 + 5 });
  });

  it("treats a null base atk as zero", () => {
    const monster = makeMonster({ atk: null });

    const result = calculateEffectiveAtkDef(monster, { activeField: null }, neutralProviders);

    expect(result.atk).toBe(0);
  });

  it("treats a null base def as zero", () => {
    const monster = makeMonster({ def: null });

    const result = calculateEffectiveAtkDef(monster, { activeField: null }, neutralProviders);

    expect(result.def).toBe(0);
  });

  it("passes null to the guardian provider when the opponent is absent", () => {
    const monster = makeMonster();
    let received: Card | null | undefined;
    const providers: ModifierProviders = {
      ...neutralProviders,
      guardian: (_monster, opponentArg) => {
        received = opponentArg;
        return { atk: 0, def: 0 };
      },
    };

    calculateEffectiveAtkDef(monster, { activeField: null }, providers);

    expect(received).toBeNull();
  });

  it("passes the given opponent to the guardian provider", () => {
    const monster = makeMonster();
    let received: Card | null | undefined;
    const providers: ModifierProviders = {
      ...neutralProviders,
      guardian: (_monster, opponentArg) => {
        received = opponentArg;
        return { atk: 0, def: 0 };
      },
    };

    calculateEffectiveAtkDef(monster, { activeField: null, opponent }, providers);

    expect(received).toEqual(opponent);
  });

  it("does not mutate the monster object it receives", () => {
    const monster = makeMonster();
    const snapshot = JSON.parse(JSON.stringify(monster)) as Card;

    calculateEffectiveAtkDef(
      monster,
      { activeField: null, opponent },
      {
        guardian: () => ({ atk: 1, def: 1 }),
        terrain: () => ({ atk: 1, def: 1 }),
        equipment: () => ({ atk: 1, def: 1 }),
      },
    );

    expect(monster).toEqual(snapshot);
  });

  it("does not mutate the context object it receives", () => {
    const monster = makeMonster();
    const context = { activeField: makeMonster({ numero: "500", tipo: "magica" as const }), opponent };
    const snapshot = JSON.parse(JSON.stringify(context)) as typeof context;

    calculateEffectiveAtkDef(monster, context, neutralProviders);

    expect(context).toEqual(snapshot);
  });
});
