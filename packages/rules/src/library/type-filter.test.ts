import type { Card, CardNumber, CardType, LibraryEntry } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { filterByCardType } from "./type-filter.ts";

function entry(cardNumber: CardNumber, tipo: CardType): LibraryEntry {
  const card: Card = {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: tipo,
    img: null,
    classe: "Dragon",
    atk: null,
    def: null,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo,
  };
  return { obtained: true, cardNumber, card, art: { kind: "placeholder" } };
}

const blocked: LibraryEntry = {
  obtained: false,
  cardNumber: "005",
  art: { kind: "silhouette" },
};

describe("filterByCardType", () => {
  const entries = [
    entry("001", "monstro"),
    entry("002", "magica"),
    entry("003", "equipamento"),
    entry("004", "ritual"),
    blocked,
  ];

  it("preserves every entry when types are empty, including ritual and blocked cards", () => {
    expect(filterByCardType(entries, [])).toEqual(entries);
  });

  it("filters one type and supports OR semantics for multiple types", () => {
    expect(filterByCardType(entries, ["monstro"])).toEqual([entries[0]]);
    expect(filterByCardType(entries, ["monstro", "equipamento"])).toEqual([entries[0], entries[2]]);
  });

  it("excludes blocked and ritual cards when a specific PRD type is active", () => {
    const result = filterByCardType(entries, ["monstro"]);
    expect(result).not.toContain(blocked);
    expect(result).not.toContain(entries[3]);
  });
});
