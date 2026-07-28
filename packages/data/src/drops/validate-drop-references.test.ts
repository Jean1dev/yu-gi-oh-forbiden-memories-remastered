import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  VALID_SEAL,
  catalogManifest,
  rawCatalogCards,
} from "../../tests/fixtures/catalog-datasets.ts";
import { createCatalog } from "../catalog/create-catalog.ts";
import type { CardCatalog } from "../catalog/types.ts";
import type { DropPool } from "./types.ts";
import { validateDropReferences } from "./validate-drop-references.ts";

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

function pool(duelista: string, ...numeros: readonly string[]): DropPool {
  return {
    duelista,
    entradas: numeros.map((numero) => ({ numero, probabilidade: 1 })),
  };
}

describe("validateDropReferences", () => {
  it("nao gera violacao quando todo numero existe no catalogo", () => {
    const violations = validateDropReferences([pool("duelista-a", "001", "002")], catalog);

    expect(violations).toEqual([]);
  });

  it("gera uma violacao por numero inexistente", () => {
    const violations = validateDropReferences([pool("duelista-a", "999")], catalog);

    expect(violations).toEqual([
      {
        duelista: "duelista-a",
        numero: "999",
        code: "numero_dropavel_inexistente",
        message: "Carta 999 referenciada no pool do duelista duelista-a nao existe no catalogo.",
      },
    ]);
  });

  it("gera violacoes para multiplas entradas invalidas no mesmo pool", () => {
    const violations = validateDropReferences([pool("duelista-a", "998", "999", "001")], catalog);

    expect(violations).toHaveLength(2);
    expect(violations.map((violation) => violation.numero)).toEqual(["998", "999"]);
  });

  it("gera violacoes em pools de duelistas diferentes", () => {
    const violations = validateDropReferences(
      [pool("duelista-a", "999"), pool("duelista-b", "998")],
      catalog,
    );

    expect(violations).toHaveLength(2);
    expect(violations.map((violation) => violation.duelista)).toEqual(["duelista-a", "duelista-b"]);
  });
});

const KNOWN_NUMEROS = ["001", "002", "003", "700", "701", "702"] as const;
const UNKNOWN_NUMEROS = ["050", "060", "070", "080", "090"] as const;

describe("validateDropReferences property: exact violation coverage", () => {
  it("reporta exatamente uma violacao por entrada com numero fora do catalogo, nunca mais nunca menos", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...KNOWN_NUMEROS, ...UNKNOWN_NUMEROS), { minLength: 1, maxLength: 10 }),
        (numeros) => {
          const source = pool("duelista-propriedade", ...numeros);
          const violations = validateDropReferences([source], catalog);

          const expectedUnknown = numeros.filter((numero) =>
            (UNKNOWN_NUMEROS as readonly string[]).includes(numero),
          );
          expect(violations).toHaveLength(expectedUnknown.length);
          expect(violations.every((violation) => catalog.getByNumero(violation.numero) === undefined)).toBe(
            true,
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});
