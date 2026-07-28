import {
  DomainError,
  err,
  ok,
  type Card,
  type CardCatalogLookup,
  type CardNumber,
  type DeckComposition,
  type DeckViolation,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { buildInitializationInput, type DeckValidator } from "./build-initialization-input.ts";
import { initDuel } from "./init-duel.ts";

function makeCard(cardNumber: CardNumber): Card {
  return {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: `Card ${cardNumber}`,
    img: null,
    classe: "Warrior",
    atk: 1000,
    def: 1000,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

const CATALOG_NUMBERS: readonly CardNumber[] = Array.from({ length: 30 }, (_, i) =>
  String(i + 1).padStart(3, "0"),
);
const CATALOG_BY_NUMBER = new Map(CATALOG_NUMBERS.map((n) => [n, makeCard(n)]));
const catalog: CardCatalogLookup = (cardNumber) => CATALOG_BY_NUMBER.get(cardNumber);

/**
 * Test-only structural validator, mirroring the rule `montarDeckPronto`
 * (`free-duel`/F02, `packages/rules`) will implement once that package
 * exists — not yet available (motor-duelo-1x1/F03, "assuma os contratos
 * externos" override). Shared shape with `build-initialization-input.test.ts`,
 * duplicated rather than imported: each test file stays self-contained,
 * matching this package's existing convention (`reaction-window.test.ts`).
 */
const validateDeck: DeckValidator = (input) => {
  const entries = Object.entries(input.composition);
  const total = entries.reduce((sum, [, quantity]) => sum + quantity, 0);

  const violations: DeckViolation[] = [];
  if (total < 40) violations.push({ type: "insufficient_size", total, missing: 40 - total });
  if (total > 40) violations.push({ type: "excessive_size", total, excess: total - 40 });

  const sortedEntries = [...entries].sort(([a], [b]) => a.localeCompare(b));
  for (const [cardNumber, quantity] of sortedEntries) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      violations.push({ type: "invalid_quantity", cardNumber, quantity });
      continue;
    }
    if (quantity > 3) violations.push({ type: "copies_exceeded", cardNumber, quantity });
    if (input.catalog(cardNumber) === undefined) violations.push({ type: "unknown_card", cardNumber });
  }

  if (violations.length > 0) {
    return err(new DomainError("Deck inválido.", "deck_ativo_invalido", { violations }));
  }

  const cardNumbers = sortedEntries.flatMap(([cardNumber, quantity]) =>
    Array.from({ length: quantity }, () => cardNumber),
  );
  return ok({ composition: input.composition, cardNumbers, total });
};

/** 14 distinct numbers out of the 30-entry catalog, 13 at 3 copies + 1 at 1 copy = 40. */
const compositionArbitrary: fc.Arbitrary<DeckComposition> = fc
  .shuffledSubarray([...CATALOG_NUMBERS], { minLength: 14, maxLength: 14 })
  .map((numbers) => {
    const entries = numbers.map((n, i) => [n, i < numbers.length - 1 ? 3 : 1] as const);
    return Object.fromEntries(entries);
  });

const seedArbitrary = fc.integer({ min: 0, max: 0xffffffff });

function alwaysThrowingSeedGenerator(): number {
  throw new Error("seedGenerator should not run when a seed is provided");
}

describe("end-to-end determinism (PRD motor-duelo-1x1 F03, critério de aceite 3)", () => {
  it("the same seed and the same two deck compositions always produce the exact same DuelState", () => {
    fc.assert(
      fc.property(compositionArbitrary, compositionArbitrary, seedArbitrary, (compositionP1, compositionP2, seed) => {
        const deps = { catalog, seedGenerator: alwaysThrowingSeedGenerator, validateDeck };
        const args = { compositionP1, compositionP2, seed };

        const first = buildInitializationInput(args, deps);
        const second = buildInitializationInput(args, deps);
        if (!first.ok || !second.ok) throw new Error("expected ok");

        const stateA = initDuel(first.value);
        const stateB = initDuel(second.value);

        expect(stateB).toEqual(stateA);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("card conservation", () => {
  it("hand + deck always contain exactly the same multiset of numero as the original composition", () => {
    fc.assert(
      fc.property(compositionArbitrary, compositionArbitrary, seedArbitrary, (compositionP1, compositionP2, seed) => {
        const deps = { catalog, seedGenerator: alwaysThrowingSeedGenerator, validateDeck };
        const built = buildInitializationInput({ compositionP1, compositionP2, seed }, deps);
        if (!built.ok) throw new Error("expected ok");

        const state = initDuel(built.value);

        for (const [player, composition] of [
          ["P1", compositionP1],
          ["P2", compositionP2],
        ] as const) {
          const observed: Record<string, number> = {};
          for (const card of [...state.players[player].hand, ...state.players[player].deck]) {
            observed[card.numero] = (observed[card.numero] ?? 0) + 1;
          }
          expect(observed).toEqual(composition);
        }
      }),
      { numRuns: 1000 },
    );
  });
});
