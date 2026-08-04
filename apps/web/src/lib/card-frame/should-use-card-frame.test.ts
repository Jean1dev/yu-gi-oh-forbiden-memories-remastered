import type { Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { shouldUseCardFrame } from "./should-use-card-frame.ts";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-Eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: null,
    guardiao2: null,
    password: "89 63 11 39",
    estrelas: 999_999,
    tipo: "monstro",
    atributo: "LIGHT",
    nivel: 8,
    descricao: "A dragon.",
    ...overrides,
  };
}

describe("shouldUseCardFrame", () => {
  it("is true when cropArt is art and the card has descricao", () => {
    expect(shouldUseCardFrame(card(), { kind: "art", path: "/cards-data/art/001.jpg" })).toBe(true);
  });

  it("is false when cropArt is not art", () => {
    expect(shouldUseCardFrame(card(), { kind: "placeholder" })).toBe(false);
    expect(shouldUseCardFrame(card(), undefined)).toBe(false);
  });

  it("is false when the card has no descricao, even with cropArt available", () => {
    const artRef = { kind: "art" as const, path: "/cards-data/art/700.jpg" };
    expect(shouldUseCardFrame(card({ descricao: null }), artRef)).toBe(false);

    const { descricao: _omitted, ...withoutDescricao } = card();
    expect(shouldUseCardFrame(withoutDescricao, artRef)).toBe(false);
  });
});
