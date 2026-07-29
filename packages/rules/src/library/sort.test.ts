import type { Card, CardNumber, CardType, LibraryEntry, LibrarySort } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { sortLibraryEntries } from "./sort.ts";

function entry(
  cardNumber: CardNumber,
  name: string,
  values: { atk?: number | null; def?: number | null; stars?: number | null; type?: CardType } = {},
): LibraryEntry {
  const card: Card = {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: name,
    img: null,
    classe: "Dragon",
    atk: values.atk ?? null,
    def: values.def ?? null,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: values.stars ?? null,
    tipo: values.type ?? "monstro",
  };
  return { obtained: true, cardNumber, card, art: { kind: "placeholder" } };
}

const blocked: LibraryEntry = {
  obtained: false,
  cardNumber: "004",
  art: { kind: "silhouette" },
};
const entries = [
  entry("003", "Águia", { atk: null, def: 50, stars: 2 }),
  entry("001", "zebra", { atk: 100, def: null, stars: 3 }),
  blocked,
  entry("002", "aguia", { atk: 50, def: 100, stars: 1 }),
];

function numbers(sort: LibrarySort): string[] {
  return sortLibraryEntries(entries, sort).map((entry) => entry.cardNumber);
}

describe("sortLibraryEntries", () => {
  it("sorts number ascending and descending", () => {
    expect(numbers({ field: "numero", direction: "asc" })).toEqual(["001", "002", "003", "004"]);
    expect(numbers({ field: "numero", direction: "desc" })).toEqual(["004", "003", "002", "001"]);
  });

  it("sorts normalized names and breaks ties by ascending number", () => {
    expect(numbers({ field: "nome", direction: "asc" })).toEqual(["002", "003", "001", "004"]);
  });

  it.each(["atk", "def", "estrelas"] as const)("sorts numeric field %s", (field) => {
    const result = numbers({ field, direction: "asc" });
    expect(result.at(-1)).toBe("004");
  });

  it("keeps absent numeric values at the end in both directions", () => {
    expect(numbers({ field: "atk", direction: "asc" }).slice(-2)).toEqual(["003", "004"]);
    expect(numbers({ field: "atk", direction: "desc" }).slice(-2)).toEqual(["003", "004"]);
  });

  it("does not mutate the received list", () => {
    const original = [...entries];
    sortLibraryEntries(entries, { field: "atk", direction: "desc" });
    expect(entries).toEqual(original);
  });
});
