import { DomainError, err, ok, type CardNumber, type Collection, type Result } from "@yugioh/shared";

import { INITIAL_DECK_SIZE, MAX_COPIES_PER_CARD, MIN_DISTINCT_POOL_SIZE } from "./constants.ts";

/**
 * Injectable randomness for the Fisher-Yates shuffle (guidelines §12.2's
 * `RandomSource`, adapted to hand back a swap index directly).
 * `nextInt(exclusiveUpperBound)` returns an integer in
 * `[0, exclusiveUpperBound)`. The pure draw never touches `Math.random()`
 * directly (spec build-deck/F02, Decision 6) — production wires a real
 * source in `apps/web`; tests use a fixed sequence.
 */
export interface RandomSource {
  nextInt(exclusiveUpperBound: number): number;
}

/**
 * Draws the signup deck (spec build-deck/F02 §3, steps 5-8): expands the
 * pool so every number appears exactly `MAX_COPIES_PER_CARD` times, shuffles
 * the expanded array with Fisher-Yates using the injected `RandomSource`,
 * and takes the first `INITIAL_DECK_SIZE` positions. Because no number can
 * appear more than `MAX_COPIES_PER_CARD` times in the expanded array, the
 * result structurally never exceeds that many copies, and its total is
 * always exactly `INITIAL_DECK_SIZE` — no rejection loop needed.
 *
 * Requires `pool` to already have at least `MIN_DISTINCT_POOL_SIZE` distinct
 * numbers; fails with `initial_pool_insufficient` otherwise, mirroring
 * `resolveInitialPool`'s guard for callers that skip it.
 */
export function drawInitialDeck(
  pool: readonly CardNumber[],
  randomSource: RandomSource,
): Result<Collection, DomainError> {
  if (pool.length < MIN_DISTINCT_POOL_SIZE) {
    return err(
      new DomainError(
        "Initial pool insufficient to generate a valid deck.",
        "initial_pool_insufficient",
        { poolSize: pool.length, required: MIN_DISTINCT_POOL_SIZE },
      ),
    );
  }

  const expanded: CardNumber[] = [];
  for (const cardNumber of pool) {
    for (let copy = 0; copy < MAX_COPIES_PER_CARD; copy += 1) {
      expanded.push(cardNumber);
    }
  }

  for (let i = expanded.length - 1; i > 0; i -= 1) {
    const j = randomSource.nextInt(i + 1);
    const swapped = expanded[i] as CardNumber;
    expanded[i] = expanded[j] as CardNumber;
    expanded[j] = swapped;
  }

  const drawn = expanded.slice(0, INITIAL_DECK_SIZE);

  const deck = new Map<CardNumber, number>();
  for (const cardNumber of drawn) {
    deck.set(cardNumber, (deck.get(cardNumber) ?? 0) + 1);
  }

  return ok(deck);
}
