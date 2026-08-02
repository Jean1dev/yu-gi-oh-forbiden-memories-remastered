import { describe, expect, it } from "vitest";

import { MAX_COPIES_PER_CARD, REQUIRED_DECK_SIZE, type Card } from "@yugioh/shared";

import { buildTestDuelist } from "./generate-test-duelist.ts";

function card(numero: string, tipo: Card["tipo"]): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Card ${numero}`,
    img: null,
    classe: tipo === "ritual" ? "Ritual" : tipo === "monstro" ? "Dragon" : "Magic",
    atk: tipo === "monstro" || tipo === "ritual" ? 1000 : null,
    def: tipo === "monstro" || tipo === "ritual" ? 1000 : null,
    guardiao1: tipo === "monstro" || tipo === "ritual" ? "Sun" : null,
    guardiao2: tipo === "monstro" || tipo === "ritual" ? "Moon" : null,
    password: null,
    estrelas: null,
    tipo,
  };
}

function catalog(): readonly Card[] {
  const monsters = Array.from({ length: 20 }, (_, index) =>
    card(String(index + 1).padStart(3, "0"), index % 5 === 0 ? "ritual" : "monstro"),
  );
  const support = Array.from({ length: 10 }, (_, index) =>
    card(String(index + 101).padStart(3, "0"), index % 2 === 0 ? "magica" : "armadilha"),
  );
  return [...monsters, ...support];
}

describe("buildTestDuelist", () => {
  it("returns a 40-card deck", () => {
    const result = buildTestDuelist(catalog(), { seed: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.deck).toHaveLength(REQUIRED_DECK_SIZE);
    }
  });

  it("respects the copy limit", () => {
    const result = buildTestDuelist(catalog(), { seed: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const counts = new Map<string, number>();
      for (const cardNumber of result.value.deck) {
        counts.set(cardNumber, (counts.get(cardNumber) ?? 0) + 1);
      }
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(MAX_COPIES_PER_CARD);
    }
  });

  it("draws 34 monsters or rituals and 6 support cards", () => {
    const cards = catalog();
    const byNumber = new Map(cards.map((entry) => [entry.numero, entry]));
    const result = buildTestDuelist(cards, { seed: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const monsters = result.value.deck.filter((cardNumber) => {
        const tipo = byNumber.get(cardNumber)?.tipo;
        return tipo === "monstro" || tipo === "ritual";
      });
      expect(monsters).toHaveLength(34);
      expect(result.value.deck.length - monsters.length).toBe(6);
    }
  });

  it("is deterministic by seed", () => {
    const first = buildTestDuelist(catalog(), { seed: 20260801 });
    const second = buildTestDuelist(catalog(), { seed: 20260801 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.value.deck).toEqual(first.value.deck);
    }
  });

  it("only uses cards from the provided catalog", () => {
    const cards = catalog();
    const known = new Set(cards.map((entry) => entry.numero));
    const result = buildTestDuelist(cards, { seed: 4 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.deck.every((cardNumber) => known.has(cardNumber))).toBe(true);
    }
  });

  it("fails when the catalog has no monsters", () => {
    const result = buildTestDuelist([card("101", "magica"), card("102", "armadilha")], {
      seed: 5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("catalog_insufficient");
    }
  });

  it("creates one non-empty drop tier from the deck", () => {
    const result = buildTestDuelist(catalog(), { seed: 6 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.dropPool).toHaveLength(1);
      expect(result.value.dropPool[0]?.cardNumbers.length).toBeGreaterThan(0);
      expect(
        result.value.dropPool[0]?.cardNumbers.every((cardNumber) =>
          result.value.deck.includes(cardNumber),
        ),
      ).toBe(true);
    }
  });
});
