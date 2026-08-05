import { describe, expect, it } from "vitest";

import { CARD_ATTRIBUTES } from "./constants.ts";
import { CardSchema } from "./schema.ts";
import type { Card } from "./types.ts";

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
    estrelas: 999_999,
    tipo: "monstro",
    ...overrides,
  };
}

describe("CardSchema — atributo/nivel/descricao", () => {
  it("accepts a card without the new fields at all", () => {
    expect(CardSchema.safeParse(validCard()).success).toBe(true);
  });

  it("accepts atributo null", () => {
    expect(CardSchema.safeParse(validCard({ atributo: null })).success).toBe(true);
  });

  it.each(CARD_ATTRIBUTES)("accepts atributo %s", (attribute) => {
    expect(CardSchema.safeParse(validCard({ atributo: attribute })).success).toBe(true);
  });

  it("rejects atributo outside the enum", () => {
    const result = CardSchema.safeParse(validCard({ atributo: "EARTH_WATER" as never }));
    expect(result.success).toBe(false);
  });

  it("accepts nivel between 1 and 12 when tipo is monstro", () => {
    expect(CardSchema.safeParse(validCard({ tipo: "monstro", nivel: 8 })).success).toBe(true);
  });

  it("rejects nivel below 1", () => {
    expect(CardSchema.safeParse(validCard({ tipo: "monstro", nivel: 0 })).success).toBe(false);
  });

  it("rejects nivel above 12", () => {
    expect(CardSchema.safeParse(validCard({ tipo: "monstro", nivel: 13 })).success).toBe(false);
  });

  it("rejects nivel filled when tipo is not monstro", () => {
    const result = CardSchema.safeParse(
      validCard({ tipo: "armadilha", atk: null, def: null, nivel: 4 }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts nivel null regardless of tipo", () => {
    const result = CardSchema.safeParse(
      validCard({ tipo: "armadilha", atk: null, def: null, nivel: null }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an empty string descricao", () => {
    expect(CardSchema.safeParse(validCard({ descricao: "" })).success).toBe(false);
  });

  it("accepts descricao null", () => {
    expect(CardSchema.safeParse(validCard({ descricao: null })).success).toBe(true);
  });

  it("accepts a fully enriched card", () => {
    const result = CardSchema.safeParse(
      validCard({
        atributo: "LIGHT",
        nivel: 8,
        descricao:
          "This legendary dragon is a powerful engine of destruction. Virtually invincible.",
      }),
    );
    expect(result.success).toBe(true);
  });
});
