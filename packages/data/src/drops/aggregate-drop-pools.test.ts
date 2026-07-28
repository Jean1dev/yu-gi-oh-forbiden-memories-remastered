import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { aggregateDropPools } from "./aggregate-drop-pools.ts";
import type { DropPool } from "./types.ts";

function pool(duelista: string, ...numeros: readonly string[]): DropPool {
  return {
    duelista,
    entradas: numeros.map((numero) => ({ numero, probabilidade: 1 })),
  };
}

describe("aggregateDropPools", () => {
  it("monta o mapa duelista para pool quando nao ha duplicata", () => {
    const result = aggregateDropPools([pool("duelista-a", "001"), pool("duelista-b", "002")]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.size).toBe(2);
    expect(result.value.get("duelista-a")?.entradas).toEqual([{ numero: "001", probabilidade: 1 }]);
  });

  it("rejeita quando dois pools compartilham o mesmo duelista", () => {
    const result = aggregateDropPools([pool("duelista-a", "001"), pool("duelista-a", "002")]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("duelista_duplicado");
    expect(result.error.details).toEqual({ duelista: "duelista-a" });
  });

  it("preserva todas as entradas do pool sem perder nenhuma", () => {
    const source = pool("duelista-a", "001", "002", "003");
    const result = aggregateDropPools([source]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.get("duelista-a")?.entradas).toHaveLength(3);
  });
});

describe("aggregateDropPools property: no duplicate under aggregation", () => {
  it("nunca rejeita quando todo duelista do conjunto e unico", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 0, maxLength: 10 }), (duelistas) => {
        const result = aggregateDropPools(duelistas.map((duelista) => pool(duelista, "001")));

        expect(result.ok).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("sempre rejeita quando ha pelo menos uma repeticao forcada de duelista", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 10 }),
        (duelistas) => {
          const first = duelistas[0];
          if (first === undefined) {
            return;
          }
          const result = aggregateDropPools([...duelistas, first].map((duelista) => pool(duelista, "001")));

          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });
});
