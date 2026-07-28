import {
  DomainError,
  err,
  ok,
  type CardCatalogLookup,
  type CardNumber,
  type CardPoolLookup,
  type InitialPoolConfig,
  type Result,
} from "@yugioh/shared";

import { MIN_DISTINCT_POOL_SIZE } from "./constants.ts";

/**
 * The resolved draw pool plus what was discarded getting there — never
 * silent (spec build-deck/F02 §6): `packages/rules` stays pure, so it hands
 * the discards back as data instead of logging them; `apps/web` is the one
 * that turns these into structured log entries.
 */
export type ResolvedInitialPool = Readonly<{
  /** Distinct card numbers eligible for the draw, size >= `MIN_DISTINCT_POOL_SIZE`. */
  numbers: readonly CardNumber[];
  /** Configured numbers with no matching card in the catalog. */
  discardedUnknown: readonly CardNumber[];
  /** Configured numbers repeated; only each number's first occurrence is kept. */
  discardedDuplicate: readonly CardNumber[];
}>;

/**
 * Resolves the effective signup draw pool (spec build-deck/F02 §3, steps
 * 1-4). Absent or empty `config.numbers` falls back to the whole catalog
 * (Decision 7, Decision 9 — no `tipo` filter): no balancing list is invented
 * ahead of the pending data. A configured list is filtered against the
 * catalog and de-duplicated, keeping each number's first occurrence.
 *
 * Fails with `initial_pool_insufficient` when fewer than
 * `MIN_DISTINCT_POOL_SIZE` distinct numbers remain — a configuration error,
 * never a partial deck (Decision 8).
 */
export function resolveInitialPool(
  config: InitialPoolConfig | undefined,
  catalog: CardCatalogLookup,
  poolLookup: CardPoolLookup,
): Result<ResolvedInitialPool, DomainError> {
  const configuredNumbers = config?.numbers;

  let numbers: readonly CardNumber[];
  let discardedUnknown: readonly CardNumber[] = [];
  let discardedDuplicate: readonly CardNumber[] = [];

  if (configuredNumbers === undefined || configuredNumbers.length === 0) {
    numbers = poolLookup();
  } else {
    const seen = new Set<CardNumber>();
    const kept: CardNumber[] = [];
    const unknown: CardNumber[] = [];
    const duplicate: CardNumber[] = [];

    for (const cardNumber of configuredNumbers) {
      if (seen.has(cardNumber)) {
        duplicate.push(cardNumber);
        continue;
      }
      seen.add(cardNumber);

      if (catalog(cardNumber) === undefined) {
        unknown.push(cardNumber);
        continue;
      }
      kept.push(cardNumber);
    }

    numbers = kept;
    discardedUnknown = Object.freeze(unknown);
    discardedDuplicate = Object.freeze(duplicate);
  }

  if (numbers.length < MIN_DISTINCT_POOL_SIZE) {
    return err(
      new DomainError(
        "Initial pool insufficient to generate a valid deck.",
        "initial_pool_insufficient",
        { poolSize: numbers.length, required: MIN_DISTINCT_POOL_SIZE },
      ),
    );
  }

  return ok(
    Object.freeze({
      numbers: Object.freeze(numbers),
      discardedUnknown,
      discardedDuplicate,
    }),
  );
}
