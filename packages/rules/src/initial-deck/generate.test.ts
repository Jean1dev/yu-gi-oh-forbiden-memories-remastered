import type { Card, CardCatalogLookup, CardNumber } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import type { RandomSource } from "./draw.ts";
import { generateInitialDeck } from "./generate.ts";

function card(numero: CardNumber): Card {
  return {
    id: 1,
    numero,
    nome: `Card ${numero}`,
    img: null,
    classe: "Dragon",
    atk: 100,
    def: 100,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

const FOURTEEN_NUMBERS: readonly CardNumber[] = Array.from({ length: 14 }, (_, i) =>
  String(i + 1).padStart(3, "0"),
);

function catalogOf(numbers: readonly CardNumber[]): CardCatalogLookup {
  const known = new Map(numbers.map((numero) => [numero, card(numero)]));
  return (numero) => known.get(numero);
}

function sequenceRandomSource(values: readonly number[]): RandomSource {
  let index = 0;
  return {
    nextInt(exclusiveUpperBound) {
      const value = values[index % values.length] as number;
      index += 1;
      return value % exclusiveUpperBound;
    },
  };
}

describe("generateInitialDeck", () => {
  it("returns a valid deck of forty cards using the whole-catalog fallback", () => {
    const result = generateInitialDeck(
      undefined,
      catalogOf(FOURTEEN_NUMBERS),
      () => FOURTEEN_NUMBERS,
      sequenceRandomSource([1, 2, 3, 4, 5]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const total = [...result.value.values()].reduce((sum, quantity) => sum + quantity, 0);
    expect(total).toBe(40);
  });

  it("propagates initial_pool_insufficient when the configured pool is too small", () => {
    const thirteen = FOURTEEN_NUMBERS.slice(0, 13);

    const result = generateInitialDeck(
      { version: "v1", numbers: thirteen },
      catalogOf(thirteen),
      () => [],
      sequenceRandomSource([0]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("initial_pool_insufficient");
  });
});
