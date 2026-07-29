import type { LibraryEntry } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { filterByCollectionStatus } from "./status.ts";

const obtained = {
  obtained: true,
  cardNumber: "001",
  card: {
    id: 1,
    numero: "001",
    nome: "A",
    img: null,
    classe: "Dragon",
    atk: 1,
    def: 1,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  },
  art: { kind: "placeholder" },
} as const satisfies LibraryEntry;
const blocked = {
  obtained: false,
  cardNumber: "002",
  art: { kind: "silhouette" },
} as const satisfies LibraryEntry;

describe("filterByCollectionStatus", () => {
  it("filters obtained, not obtained and all while preserving order", () => {
    const entries = [blocked, obtained];
    expect(filterByCollectionStatus(entries, "obtidas")).toEqual([obtained]);
    expect(filterByCollectionStatus(entries, "nao-obtidas")).toEqual([blocked]);
    expect(filterByCollectionStatus(entries, "todas")).toEqual(entries);
  });

  it("returns an empty list for empty input", () => {
    expect(filterByCollectionStatus([], "todas")).toEqual([]);
  });
});
