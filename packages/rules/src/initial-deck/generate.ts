import type {
  CardCatalogLookup,
  CardPoolLookup,
  Collection,
  DomainError,
  InitialPoolConfig,
  Result,
} from "@yugioh/shared";

import { drawInitialDeck, type RandomSource } from "./draw.ts";
import { resolveInitialPool } from "./pool.ts";
import { verifyGeneratedDeckInvariants } from "./validation.ts";

/**
 * Composes the whole pure pipeline `apps/web`'s orchestration consumes in a
 * single call (spec build-deck/F02 §3, step 10): resolve the pool, draw the
 * deck, verify the result.
 */
export function generateInitialDeck(
  config: InitialPoolConfig | undefined,
  catalog: CardCatalogLookup,
  poolLookup: CardPoolLookup,
  randomSource: RandomSource,
): Result<Collection, DomainError> {
  const poolResult = resolveInitialPool(config, catalog, poolLookup);
  if (!poolResult.ok) {
    return poolResult;
  }

  const drawResult = drawInitialDeck(poolResult.value.numbers, randomSource);
  if (!drawResult.ok) {
    return drawResult;
  }

  return verifyGeneratedDeckInvariants(drawResult.value);
}
