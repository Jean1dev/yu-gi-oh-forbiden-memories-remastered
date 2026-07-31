import { describe, expect, it } from "vitest";
import type { Card } from "@yugioh/shared";
import { generateCardPricesSeed } from "./generate-card-prices-seed.ts";

const card = (overrides: Partial<Card> = {}): Card => ({ id: 1, numero: "001", nome: "Card", img: null, classe: "Dragon", atk: 1, def: 1, guardiao1: null, guardiao2: null, password: "12 34 56 78", estrelas: 10, tipo: "monstro", ...overrides });
describe("card price seed generator", () => {
  it("includes only password cards deterministically", () => {
    const cards = [card(), card({ id: 2, numero: "002", password: null })];
    expect(generateCardPricesSeed(cards, "v1")).toBe(generateCardPricesSeed(cards, "v1"));
    expect(generateCardPricesSeed(cards, "v1")).toContain("('001', '12345678', 10, 'v1')");
    expect(generateCardPricesSeed(cards, "v1")).not.toContain("'002'");
  });
  it("uses the unpriced fallback", () => expect(generateCardPricesSeed([card({ estrelas: null })], "v1")).toContain("999999"));
});
