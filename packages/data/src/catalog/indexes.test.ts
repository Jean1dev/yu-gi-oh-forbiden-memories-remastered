import { CARD_TYPES, type Card } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { catalogCards } from "../../tests/fixtures/catalog-datasets.ts";
import { buildIndexes } from "./indexes.ts";

function numerosOf(cards: readonly Card[]): readonly string[] {
  return cards.map((card) => card.numero);
}

describe("buildIndexes", () => {
  it("maps every card under its own numero", () => {
    const cards = catalogCards();

    const indexes = buildIndexes(cards);

    expect(indexes.byNumero.size).toBe(cards.length);
    for (const card of cards) {
      expect(indexes.byNumero.get(card.numero)).toBe(card);
    }
  });

  it("groups by tipo with each list ascending by numero", () => {
    const indexes = buildIndexes(catalogCards());

    expect(numerosOf(indexes.byTipo.get("monstro") ?? [])).toEqual(["001", "002", "003"]);
    expect(numerosOf(indexes.byTipo.get("magica") ?? [])).toEqual(["700"]);
    expect(numerosOf(indexes.byTipo.get("ritual") ?? [])).toEqual(["702"]);
    // Nothing in the fixture is an equip, so the key never opens at all.
    expect(indexes.byTipo.has("equipamento")).toBe(false);
  });

  it("groups by classe from the dataset itself, with no fixed list", () => {
    const indexes = buildIndexes(catalogCards());

    expect([...indexes.byClasse.keys()].sort()).toEqual([
      "Beast-Warrior",
      "Dragon",
      "Magic",
      "Ritual",
      "Trap",
      "Warrior",
    ]);
    expect(numerosOf(indexes.byClasse.get("Dragon") ?? [])).toEqual(["001"]);
  });

  it("lists a card under both Guardian Stars when they differ", () => {
    const indexes = buildIndexes(catalogCards());

    expect(numerosOf(indexes.byGuardiao.get("Sun") ?? [])).toEqual(["001"]);
    expect(numerosOf(indexes.byGuardiao.get("Jupiter") ?? [])).toEqual(["003"]);
    expect(numerosOf(indexes.byGuardiao.get("Moon") ?? [])).toEqual(["003"]);
  });

  it("lists a card once when both Guardian Stars are the same", () => {
    const indexes = buildIndexes(catalogCards());

    expect(numerosOf(indexes.byGuardiao.get("Mars") ?? [])).toEqual(["001", "002"]);
  });

  it("indexes only the cards that carry a password", () => {
    const cards = catalogCards();

    const indexes = buildIndexes(cards);

    const withPassword = cards.filter((card) => card.password !== null);
    expect(indexes.byPassword.size).toBe(withPassword.length);
    for (const card of withPassword) {
      expect(indexes.byPassword.get(card.password ?? "")).toBe(card);
    }
  });

  it("freezes every list it hands out", () => {
    const indexes = buildIndexes(catalogCards());

    for (const bucket of [...indexes.byTipo.values(), ...indexes.byClasse.values()]) {
      expect(Object.isFrozen(bucket)).toBe(true);
    }
  });

  it("keeps the same output order for any input order", () => {
    const cards = [...catalogCards()];
    const expected = buildIndexes(cards);

    fc.assert(
      fc.property(fc.shuffledSubarray(cards, { minLength: cards.length }), (shuffled) => {
        const indexes = buildIndexes(shuffled);

        for (const tipo of CARD_TYPES) {
          expect(numerosOf(indexes.byTipo.get(tipo) ?? [])).toEqual(
            numerosOf(expected.byTipo.get(tipo) ?? []),
          );
        }
        for (const classe of expected.byClasse.keys()) {
          expect(numerosOf(indexes.byClasse.get(classe) ?? [])).toEqual(
            numerosOf(expected.byClasse.get(classe) ?? []),
          );
        }
        for (const guardiao of expected.byGuardiao.keys()) {
          expect(numerosOf(indexes.byGuardiao.get(guardiao) ?? [])).toEqual(
            numerosOf(expected.byGuardiao.get(guardiao) ?? []),
          );
        }
      }),
    );
  });

  it("places every card in each index its own fields ask for", () => {
    const cards = [...catalogCards()];

    fc.assert(
      fc.property(fc.shuffledSubarray(cards, { minLength: 1 }), (subset) => {
        const indexes = buildIndexes(subset);

        for (const card of subset) {
          expect(indexes.byTipo.get(card.tipo)).toContain(card);
          expect(indexes.byClasse.get(card.classe)).toContain(card);
          if (card.guardiao1 !== null) {
            expect(indexes.byGuardiao.get(card.guardiao1)).toContain(card);
          }
          if (card.guardiao2 !== null) {
            expect(indexes.byGuardiao.get(card.guardiao2)).toContain(card);
          }
        }
      }),
    );
  });
});
