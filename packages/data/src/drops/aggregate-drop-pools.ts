import { DomainError, err, ok, type Result } from "@yugioh/shared";

import type { DropPool, DuelistaId } from "./types.ts";

/**
 * Groups schema-valid pools by `duelista` into a map. A second pool sharing a
 * `duelista` already seen aborts immediately with `duelista_duplicado`
 * (spec F08, Decision 7) — the two lists of `entradas` are never merged
 * silently.
 */
export function aggregateDropPools(
  pools: readonly DropPool[],
): Result<ReadonlyMap<DuelistaId, DropPool>, DomainError> {
  const map = new Map<DuelistaId, DropPool>();

  for (const pool of pools) {
    if (map.has(pool.duelista)) {
      return err(
        new DomainError(
          `Duelista ${pool.duelista} duplicado na tabela de drops.`,
          "duelista_duplicado",
          { duelista: pool.duelista },
        ),
      );
    }
    map.set(pool.duelista, pool);
  }

  return ok(map);
}
