import {
  DomainError,
  DuelStateSchema,
  err,
  ok,
  type Card,
  type CardCatalogLookup,
  type CardNumber,
  type DeckComposition,
  type DeckViolation,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import {
  buildInitializationInput,
  initDuel,
  type DeckValidator,
} from "../src/initialization/index.ts";

/**
 * Exercises `buildInitializationInput` + `initDuel` end to end, confirming
 * the happy path produces a `DuelState` that passes `DuelStateSchema`
 * (motor-duelo-1x1 F03 spec, §7 Integração).
 *
 * `banco-de-cartas`/F03 (the real card catalog) is not implemented yet, so
 * this test uses a synthetic in-memory catalog instead of the real one —
 * registered as a pending smoke check until that feature lands.
 */

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

const CATALOG_NUMBERS: readonly CardNumber[] = Array.from({ length: 40 }, (_, i) =>
  String(i + 1).padStart(3, "0"),
);
const CATALOG_BY_NUMBER = new Map(CATALOG_NUMBERS.map((n) => [n, makeCard(n)]));
const catalog: CardCatalogLookup = (cardNumber) => CATALOG_BY_NUMBER.get(cardNumber);

/** A real 40-card deck composition: 40 distinct numeros, 1 copy each. */
function realDeckComposition(numbers: readonly CardNumber[]): DeckComposition {
  return Object.fromEntries(numbers.map((n) => [n, 1]));
}

/**
 * Test-only structural validator standing in for `montarDeckPronto`
 * (`free-duel`/F02, `packages/rules`), not yet implemented — see the
 * "assuma os contratos externos" override note in `build-initialization-input.ts`.
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

describe("initDuel end-to-end (build + init)", () => {
  it("produces a DuelState that passes DuelStateSchema for two real 40-card decks", () => {
    const compositionP1 = realDeckComposition(CATALOG_NUMBERS.slice(0, 40));
    const compositionP2 = realDeckComposition(CATALOG_NUMBERS.slice(0, 40));

    const built = buildInitializationInput(
      { compositionP1, compositionP2, seed: 1753617600 },
      { catalog, seedGenerator: () => 0, validateDeck },
    );

    expect(built.ok).toBe(true);
    if (!built.ok) throw new Error("expected ok");

    const state = initDuel(built.value);

    const parsed = DuelStateSchema.safeParse(state);
    expect(parsed.success).toBe(true);
    expect(state.turn).toBe(1);
    expect(state.phase).toBe("draw");
    expect(state.seed).toBe(1753617600);
  });
});
