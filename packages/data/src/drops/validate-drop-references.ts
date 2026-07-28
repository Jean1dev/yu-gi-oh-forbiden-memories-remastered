import type { CardCatalog } from "../catalog/types.ts";
import type { DropPool, DropViolation } from "./types.ts";

/**
 * Flags every entry across every pool whose `numero` does not exist in the
 * catalog (F03). Never stops at the first offender: `createDropTable`
 * reports every violation at once so the data maintainer can fix them all in
 * one pass (spec F08 §3 step 4).
 */
export function validateDropReferences(
  pools: readonly DropPool[],
  catalog: CardCatalog,
): readonly DropViolation[] {
  const violations: DropViolation[] = [];

  for (const pool of pools) {
    for (const entrada of pool.entradas) {
      if (catalog.getByNumero(entrada.numero) === undefined) {
        violations.push({
          duelista: pool.duelista,
          numero: entrada.numero,
          code: "numero_dropavel_inexistente",
          message: `Carta ${entrada.numero} referenciada no pool do duelista ${pool.duelista} nao existe no catalogo.`,
        });
      }
    }
  }

  return violations;
}
