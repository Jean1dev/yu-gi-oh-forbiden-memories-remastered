import {
  DomainError,
  MAX_COPIES_PER_CARD,
  REQUIRED_DECK_SIZE,
  err,
  ok,
  type CardNumber,
  type NpcDeck,
  type Result,
} from "@yugioh/shared";

import type { DuelistPoolEntry } from "./duelist-source.ts";

/** Every pool in the original game's tables sums to this. */
export const POOL_WEIGHT_TOTAL = 2048;

/**
 * The two card numbers the original game skips unconditionally while building
 * an NPC deck. Neither appears in a vanilla pool, so this only matters if a
 * pool is ever hand-edited.
 */
const SKIPPED_CARD_NUMBERS: ReadonlySet<CardNumber> = new Set(["721", "722"]);

/**
 * A pool made almost entirely of 2/2048 entries needs a few thousand rolls to
 * fill 40 slots — Teana's tail is exactly that shape. The bound only exists so
 * a degenerate pool fails as a value instead of hanging.
 */
const MAX_ROLLS = 100_000;

function pickFromPool(
  sortedPool: readonly DuelistPoolEntry[],
  roll: number,
): CardNumber | undefined {
  let remaining = roll;
  for (const entry of sortedPool) {
    remaining -= entry.weight;
    if (remaining < 0) {
      return entry.cardNumber;
    }
  }
  // Rolled past the end of a pool whose weights do not reach the total: the
  // original game skips the draw rather than clamping to the last entry.
  return undefined;
}

/**
 * Builds one NPC deck out of a weighted pool, reproducing the original game's
 * own generation routine (quoted verbatim in `sg4e/YGOFM-gamedata`,
 * `Pool.java`): roll `0..2047`, walk the entries **in card-number order**
 * subtracting each weight until the running total goes negative, and keep the
 * card if the deck holds fewer than three copies of it. Repeat until 40.
 *
 * The game re-rolls the deck at the start of every duel; this project stores a
 * fixed 40-card deck per duelist (`DuelistSchema.deck`), so the caller passes a
 * recorded seed and the result becomes the duelist's canonical deck — same
 * distribution as the original, but reviewable in a diff.
 *
 * `random` is injected rather than seeded here: no domain core owns global
 * state, and the caller already knows which seed it recorded.
 */
export function deriveNpcDeck(
  pool: readonly DuelistPoolEntry[],
  random: () => number,
): Result<NpcDeck, DomainError> {
  const sortedPool = [...pool].sort((left, right) =>
    left.cardNumber.localeCompare(right.cardNumber),
  );
  const deck: CardNumber[] = [];
  const copies = new Map<CardNumber, number>();

  for (let roll = 0; roll < MAX_ROLLS && deck.length < REQUIRED_DECK_SIZE; roll += 1) {
    const cardNumber = pickFromPool(sortedPool, Math.floor(random() * POOL_WEIGHT_TOTAL));
    if (cardNumber === undefined || SKIPPED_CARD_NUMBERS.has(cardNumber)) {
      continue;
    }

    const currentCopies = copies.get(cardNumber) ?? 0;
    if (currentCopies >= MAX_COPIES_PER_CARD) {
      continue;
    }

    copies.set(cardNumber, currentCopies + 1);
    deck.push(cardNumber);
  }

  if (deck.length !== REQUIRED_DECK_SIZE) {
    return err(
      new DomainError(
        "The deck pool cannot fill a 40-card deck within the roll budget.",
        "deck_pool_exhausted",
        { drawn: deck.length, distinctCards: sortedPool.length, maxRolls: MAX_ROLLS },
      ),
    );
  }

  return ok(deck);
}

/** Sum of every weight in a pool. `POOL_WEIGHT_TOTAL` in well-formed game data. */
export function totalPoolWeight(pool: readonly DuelistPoolEntry[]): number {
  return pool.reduce((total, entry) => total + entry.weight, 0);
}
