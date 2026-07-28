import type { Card, CardCatalogLookup, CardNumber } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { resolveInitialPool } from "./pool.ts";

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

function wholeCatalog(numbers: readonly CardNumber[]): {
  catalog: CardCatalogLookup;
  poolLookup: () => readonly CardNumber[];
} {
  const known = new Map(numbers.map((numero) => [numero, card(numero)]));
  return {
    catalog: (numero) => known.get(numero),
    poolLookup: () => numbers,
  };
}

const FOURTEEN_NUMBERS = Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(3, "0"));

describe("resolveInitialPool", () => {
  it("returns the whole catalog when config is absent", () => {
    const { catalog, poolLookup } = wholeCatalog(FOURTEEN_NUMBERS);

    const result = resolveInitialPool(undefined, catalog, poolLookup);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.numbers).toEqual(FOURTEEN_NUMBERS);
    expect(result.value.discardedUnknown).toEqual([]);
    expect(result.value.discardedDuplicate).toEqual([]);
  });

  it("returns the whole catalog when numbers is empty", () => {
    const { catalog, poolLookup } = wholeCatalog(FOURTEEN_NUMBERS);

    const result = resolveInitialPool({ version: "v1", numbers: [] }, catalog, poolLookup);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.numbers).toEqual(FOURTEEN_NUMBERS);
  });

  it("uses the configured list when present and valid against the catalog", () => {
    const { catalog, poolLookup } = wholeCatalog(FOURTEEN_NUMBERS);
    const configured = FOURTEEN_NUMBERS.slice(0, 14);

    const result = resolveInitialPool({ version: "v1", numbers: configured }, catalog, poolLookup);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.numbers).toEqual(configured);
  });

  it("discards a configured number with no matching card and reports it", () => {
    const { catalog, poolLookup } = wholeCatalog(FOURTEEN_NUMBERS);
    const configured = [...FOURTEEN_NUMBERS, "999"];

    const result = resolveInitialPool({ version: "v1", numbers: configured }, catalog, poolLookup);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.numbers).not.toContain("999");
    expect(result.value.discardedUnknown).toEqual(["999"]);
  });

  it("discards a duplicate number keeping its first occurrence", () => {
    const { catalog, poolLookup } = wholeCatalog(FOURTEEN_NUMBERS);
    const configured = [...FOURTEEN_NUMBERS, FOURTEEN_NUMBERS[0] as string];

    const result = resolveInitialPool({ version: "v1", numbers: configured }, catalog, poolLookup);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.numbers.filter((n) => n === FOURTEEN_NUMBERS[0])).toHaveLength(1);
    expect(result.value.discardedDuplicate).toEqual([FOURTEEN_NUMBERS[0]]);
  });

  it("fails with initial_pool_insufficient when fewer than fourteen distinct numbers remain", () => {
    const thirteen = FOURTEEN_NUMBERS.slice(0, 13);
    const { catalog, poolLookup } = wholeCatalog(thirteen);

    const result = resolveInitialPool(undefined, catalog, poolLookup);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("initial_pool_insufficient");
  });

  it("accepts a pool of exactly fourteen distinct numbers", () => {
    const { catalog, poolLookup } = wholeCatalog(FOURTEEN_NUMBERS);

    const result = resolveInitialPool(undefined, catalog, poolLookup);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.numbers).toHaveLength(14);
  });
});
