import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  VALID_SEAL,
  catalogManifest,
  rawCatalogCards,
} from "../../tests/fixtures/catalog-datasets.ts";
import { createCatalog } from "../catalog/create-catalog.ts";
import type { CardCatalog } from "../catalog/types.ts";
import { createDropTable } from "./create-drop-table.ts";
import type { DropTable } from "./types.ts";

/** The fixture catalog carries numeros 001/002/003/700/701/702. */
function buildCatalog(): CardCatalog {
  const result = createCatalog({
    rawCards: rawCatalogCards(),
    manifest: catalogManifest(),
    seal: VALID_SEAL,
  });
  if (!result.ok) {
    throw new Error(`catalog was expected to build: ${result.error.message}`);
  }
  return result.value;
}

const catalog = buildCatalog();

function createOrFail(poolsBruto: unknown): DropTable {
  const result = createDropTable({ poolsBruto, catalogo: catalog });
  if (!result.ok) {
    throw new Error(`drop table was expected to build: ${result.error.message}`);
  }
  return result.value;
}

describe("createDropTable", () => {
  it("resulta em tabela vazia quando poolsBruto e um array vazio", () => {
    const table = createOrFail([]);

    expect(table.listDropPools()).toEqual([]);
    expect(table.listDuelistasWithPool()).toEqual([]);
    expect(table.countDropPools()).toBe(0);
  });

  it("rejeita quando o schema estrutural falha", () => {
    const result = createDropTable({
      poolsBruto: [{ duelista: "duelista-a", entradas: [] }],
      catalogo: catalog,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("schema_tabela_drops_invalido");
    }
  });

  it("rejeita quando ha duelista duplicado", () => {
    const result = createDropTable({
      poolsBruto: [
        { duelista: "duelista-a", entradas: [{ numero: "001", probabilidade: 1 }] },
        { duelista: "duelista-a", entradas: [{ numero: "002", probabilidade: 1 }] },
      ],
      catalogo: catalog,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("duelista_duplicado");
    }
  });

  it("rejeita quando ha numero inexistente no catalogo", () => {
    const result = createDropTable({
      poolsBruto: [{ duelista: "duelista-a", entradas: [{ numero: "999", probabilidade: 1 }] }],
      catalogo: catalog,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("numero_dropavel_inexistente");
      expect(result.error.details.violacoes).toHaveLength(1);
    }
  });

  it("resulta em tabela funcional quando todas as checagens passam", () => {
    const table = createOrFail([
      { duelista: "duelista-a", entradas: [{ numero: "001", probabilidade: 1 }] },
      { duelista: "duelista-b", entradas: [{ numero: "002", probabilidade: 4, condicao: "vitoria_modo_dificil" }] },
    ]);

    expect(table.countDropPools()).toBe(2);
    expect(table.getPoolByDuelista("duelista-a")).toEqual([{ numero: "001", probabilidade: 1 }]);
  });

  it("congela cada pool e cada entrada retornada", () => {
    const table = createOrFail([
      { duelista: "duelista-a", entradas: [{ numero: "001", probabilidade: 1 }] },
    ]);

    for (const pool of table.listDropPools()) {
      expect(Object.isFrozen(pool)).toBe(true);
      expect(Object.isFrozen(pool.entradas)).toBe(true);
      for (const entrada of pool.entradas) {
        expect(Object.isFrozen(entrada)).toBe(true);
      }
    }
  });
});

describe("DropTable built from createDropTable", () => {
  it("getPoolByDuelista retorna as entradas do pool correspondente", () => {
    const table = createOrFail([
      { duelista: "duelista-a", entradas: [{ numero: "001", probabilidade: 1 }] },
    ]);

    expect(table.getPoolByDuelista("duelista-a")).toEqual([{ numero: "001", probabilidade: 1 }]);
  });

  it("getPoolByDuelista retorna lista vazia para duelista sem pool definido", () => {
    const table = createOrFail([]);

    expect(table.getPoolByDuelista("duelista-inexistente")).toEqual([]);
  });

  it("listDuelistasWithPool retorna os duelistas em ordem alfabetica", () => {
    const table = createOrFail([
      { duelista: "zebra", entradas: [{ numero: "001", probabilidade: 1 }] },
      { duelista: "abacate", entradas: [{ numero: "002", probabilidade: 1 }] },
    ]);

    expect(table.listDuelistasWithPool()).toEqual(["abacate", "zebra"]);
  });

  it("listDropPools retorna todos os pools agregados", () => {
    const table = createOrFail([
      { duelista: "duelista-a", entradas: [{ numero: "001", probabilidade: 1 }] },
      { duelista: "duelista-b", entradas: [{ numero: "002", probabilidade: 1 }] },
    ]);

    expect(table.listDropPools()).toHaveLength(2);
  });

  it("countDropPools reflete o numero de pools da tabela", () => {
    const table = createOrFail([
      { duelista: "duelista-a", entradas: [{ numero: "001", probabilidade: 1 }] },
      { duelista: "duelista-b", entradas: [{ numero: "002", probabilidade: 1 }] },
      { duelista: "duelista-c", entradas: [{ numero: "003", probabilidade: 1 }] },
    ]);

    expect(table.countDropPools()).toBe(3);
  });
});

const KNOWN_NUMEROS = ["001", "002", "003", "700", "701", "702"] as const;

const duelistaArb = fc
  .string({ minLength: 1, maxLength: 8 })
  .filter((value) => value.trim().length > 0);

const dropPoolArb = fc.record({
  duelista: duelistaArb,
  entradas: fc.array(
    fc.record({ numero: fc.constantFrom(...KNOWN_NUMEROS), probabilidade: fc.integer({ min: 1, max: 10 }) }),
    { minLength: 1, maxLength: 3 },
  ),
});

describe("createDropTable properties: deterministic listing order", () => {
  it("listDuelistasWithPool e listDropPools devolvem sempre a mesma ordem alfabetica, qualquer que seja a ordem de entrada", () => {
    fc.assert(
      fc.property(fc.uniqueArray(dropPoolArb, { selector: (pool) => pool.duelista, maxLength: 8 }), (pools) => {
        const result = createDropTable({ poolsBruto: pools, catalogo: catalog });
        if (!result.ok) {
          return;
        }

        const sorted = pools
          .map((pool) => pool.duelista.trim())
          .sort((a, b) => a.localeCompare(b));
        expect(result.value.listDuelistasWithPool()).toEqual(sorted);
        expect(result.value.listDropPools().map((pool) => pool.duelista)).toEqual(sorted);

        const shuffled = [...pools].reverse();
        const shuffledResult = createDropTable({ poolsBruto: shuffled, catalogo: catalog });
        if (!shuffledResult.ok) {
          return;
        }
        expect(shuffledResult.value.listDuelistasWithPool()).toEqual(sorted);
      }),
      { numRuns: 500 },
    );
  });
});
