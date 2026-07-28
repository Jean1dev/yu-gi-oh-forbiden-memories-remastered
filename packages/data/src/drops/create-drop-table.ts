import { DomainError, err, ok, type Result } from "@yugioh/shared";

import type { CardCatalog } from "../catalog/types.ts";
import { aggregateDropPools } from "./aggregate-drop-pools.ts";
import type { DropEntry, DropPool, DropTable } from "./types.ts";
import { validateDropReferences } from "./validate-drop-references.ts";
import { validateDropTableSchema } from "./validate-drop-table-schema.ts";

export type CreateDropTableInput = Readonly<{
  /** `JSON.parse` of `drop-tables.json`, still untrusted (or `[]` when the file is absent). */
  poolsBruto: unknown;
  /** Already loaded and valid (F03) — this feature never builds its own catalog. */
  catalogo: CardCatalog;
}>;

function freezeEntry(entry: DropEntry): DropEntry {
  return Object.freeze({ ...entry });
}

function freezePool(pool: DropPool): DropPool {
  return Object.freeze({
    duelista: pool.duelista,
    entradas: Object.freeze(pool.entradas.map(freezeEntry)),
  });
}

/**
 * Runs the whole drop-table pipeline over an already-parsed raw array and
 * the already-loaded catalog: schema, duelista duplicate, numero reference,
 * in that order (spec F08 §3 steps 2-4).
 *
 * All-or-nothing except for the empty case (spec F08, Decision 7): the first
 * schema problem or the first duplicated duelista aborts immediately, every
 * numero reference violation is collected before deciding — but an empty
 * `poolsBruto` array is success, not an error, because it is the expected
 * state while the real drop values remain pending external data (spec F08,
 * Decision 3). Every query on the resulting table then answers `[]` rather
 * than failing.
 */
export function createDropTable(input: CreateDropTableInput): Result<DropTable, DomainError> {
  const schemaResult = validateDropTableSchema(input.poolsBruto);
  if (!schemaResult.ok) {
    return schemaResult;
  }

  const aggregateResult = aggregateDropPools(schemaResult.value);
  if (!aggregateResult.ok) {
    return aggregateResult;
  }

  const violations = validateDropReferences(schemaResult.value, input.catalogo);
  if (violations.length > 0) {
    return err(
      new DomainError(
        "Um ou mais numeros referenciados na tabela de drops nao existem no catalogo.",
        "numero_dropavel_inexistente",
        { violacoes: violations },
      ),
    );
  }

  const pools: readonly DropPool[] = Object.freeze(
    [...aggregateResult.value.entries()]
      .sort(([duelistaA], [duelistaB]) => duelistaA.localeCompare(duelistaB))
      .map(([, pool]) => freezePool(pool)),
  );
  const duelistas: readonly string[] = Object.freeze(pools.map((pool) => pool.duelista));
  const index = new Map(pools.map((pool) => [pool.duelista, pool] as const));

  const table: DropTable = {
    getPoolByDuelista(duelista) {
      return index.get(duelista)?.entradas ?? [];
    },
    listDuelistasWithPool() {
      return duelistas;
    },
    listDropPools() {
      return pools;
    },
    countDropPools() {
      return pools.length;
    },
  };

  return ok(Object.freeze(table));
}
