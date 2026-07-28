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
import { describe, expect, it, vi } from "vitest";

import { buildInitializationInput } from "./build-initialization-input.ts";
import type { DeckValidator } from "./build-initialization-input.ts";

function makeCard(cardNumber: CardNumber, overrides: Partial<Card> = {}): Card {
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
    ...overrides,
  };
}

function makeCatalog(cards: readonly Card[]): CardCatalogLookup {
  const byNumber = new Map(cards.map((card) => [card.numero, card]));
  return (cardNumber) => byNumber.get(cardNumber);
}

/** 14 distinct numbers, enough to build a 40-card deck at <=3 copies each. */
const CARD_NUMBERS: readonly CardNumber[] = Array.from(
  { length: 14 },
  (_, i) => String(i + 1).padStart(3, "0"),
);

function withQuantities(entries: Readonly<Record<CardNumber, number>>): DeckComposition {
  return entries;
}

/**
 * Test-only structural validator, mirroring the rule `montarDeckPronto`
 * (`free-duel`/F02, `packages/rules`) will implement once that package
 * exists. Lives only in this test file — production code never fakes it
 * (motor-duelo-1x1/F03, "assuma os contratos externos" override).
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
    if (quantity > 3) {
      violations.push({ type: "copies_exceeded", cardNumber, quantity });
    }
    if (input.catalog(cardNumber) === undefined) {
      violations.push({ type: "unknown_card", cardNumber });
    }
  }

  if (violations.length > 0) {
    return err(new DomainError("Deck inválido.", "deck_ativo_invalido", { violations }));
  }

  const cardNumbers = sortedEntries.flatMap(([cardNumber, quantity]) =>
    Array.from({ length: quantity }, () => cardNumber),
  );
  return ok({ composition: input.composition, cardNumbers, total });
};

/** 13 numbers at 3 copies (39) + 1 number at 1 copy = 40, all <=3 copies. */
function validComposition(cardNumbers: readonly CardNumber[]): DeckComposition {
  const entries = cardNumbers.map((n, i) => [n, i < cardNumbers.length - 1 ? 3 : 1] as const);
  return withQuantities(Object.fromEntries(entries));
}

const VALID_COMPOSITION = validComposition(CARD_NUMBERS);
const CATALOG = makeCatalog(CARD_NUMBERS.map((n) => makeCard(n)));

function baseDeps() {
  return {
    catalog: CATALOG,
    seedGenerator: vi.fn(() => 999),
    validateDeck: vi.fn(validateDeck),
  };
}

describe("buildInitializationInput", () => {
  it("rejects a P1 deck with fewer than 40 cards", () => {
    const deps = baseDeps();
    const result = buildInitializationInput(
      { compositionP1: withQuantities({ "001": 39 }), compositionP2: VALID_COMPOSITION },
      deps,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error.code).toBe("invalid_deck_size");
    expect(result.error.details["player"]).toBe("P1");
  });

  it("rejects a P1 deck with more than 40 cards", () => {
    const deps = baseDeps();
    const result = buildInitializationInput(
      { compositionP1: withQuantities({ "001": 41 }), compositionP2: VALID_COMPOSITION },
      deps,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error.code).toBe("invalid_deck_size");
  });

  it("rejects a deck with 4 copies of the same card", () => {
    const deps = baseDeps();
    const composition = withQuantities({ "001": 4, "002": 12, "003": 12, "004": 12 });
    const result = buildInitializationInput(
      { compositionP1: composition, compositionP2: VALID_COMPOSITION },
      deps,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error.code).toBe("deck_copies_exceeded");
  });

  it("rejects a deck with a card whose numero does not exist in the catalog, citing the numero", () => {
    const deps = baseDeps();
    // Same shape as VALID_COMPOSITION (13x3 + 1x1 = 40, all <=3 copies), but
    // the single-copy entry is a numero the catalog does not resolve.
    const composition = withQuantities({
      ...Object.fromEntries(CARD_NUMBERS.slice(0, -1).map((n) => [n, 3])),
      "998": 1,
    });
    const result = buildInitializationInput(
      { compositionP1: composition, compositionP2: VALID_COMPOSITION },
      deps,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error.code).toBe("unknown_deck_card");
    expect(result.error.message).toContain("998");
  });

  it("maps an invalid_quantity violation to the size message (spec Decision 11)", () => {
    const deps = baseDeps();
    // NaN keeps `total` itself NaN, so neither size comparison fires — the
    // only violation produced is invalid_quantity, isolating this case.
    const composition = withQuantities({
      [CARD_NUMBERS[0] ?? "001"]: Number.NaN,
      [CARD_NUMBERS[1] ?? "002"]: 3,
      [CARD_NUMBERS[2] ?? "003"]: 3,
    });
    const result = buildInitializationInput(
      { compositionP1: composition, compositionP2: VALID_COMPOSITION },
      deps,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error.code).toBe("invalid_deck_size");
  });

  it("rejects an invalid P1 deck without checking P2", () => {
    const deps = baseDeps();
    buildInitializationInput(
      { compositionP1: withQuantities({ "001": 39 }), compositionP2: VALID_COMPOSITION },
      deps,
    );

    expect(deps.validateDeck).toHaveBeenCalledTimes(1);
  });

  it("resolves the full 40 cards on each side from the numero list", () => {
    const deps = baseDeps();
    const result = buildInitializationInput(
      { compositionP1: VALID_COMPOSITION, compositionP2: VALID_COMPOSITION, seed: 1 },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.players.P1.cards).toHaveLength(40);
    expect(result.value.players.P2.cards).toHaveLength(40);
    for (const card of result.value.players.P1.cards) {
      expect(CATALOG(card.numero)).toEqual(card);
    }
  });

  it("uses the provided seed when present", () => {
    const deps = baseDeps();
    const result = buildInitializationInput(
      { compositionP1: VALID_COMPOSITION, compositionP2: VALID_COMPOSITION, seed: 42 },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.seed).toBe(42);
    expect(deps.seedGenerator).not.toHaveBeenCalled();
  });

  it("calls seedGenerator when seed is absent", () => {
    const deps = baseDeps();
    const result = buildInitializationInput(
      { compositionP1: VALID_COMPOSITION, compositionP2: VALID_COMPOSITION },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.seed).toBe(999);
    expect(deps.seedGenerator).toHaveBeenCalledTimes(1);
  });
});
