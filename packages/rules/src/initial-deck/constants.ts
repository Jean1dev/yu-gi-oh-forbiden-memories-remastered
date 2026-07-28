/** Deck-structure invariant (`product.md`, Fase 0.3): the signup deck has exactly 40 cards. */
export const INITIAL_DECK_SIZE = 40;

/** Deck-structure invariant (`product.md`, Fase 0.3): at most 3 copies of any one card. */
export const MAX_COPIES_PER_CARD = 3;

/**
 * The smallest pool of distinct card numbers that can produce a deck of
 * `INITIAL_DECK_SIZE` cards with at most `MAX_COPIES_PER_CARD` copies each
 * (spec build-deck/F02, Decision 8): `13 * 3 + 1 = 40`, so 13 distinct
 * numbers is one card short of enough.
 */
export const MIN_DISTINCT_POOL_SIZE = Math.ceil(INITIAL_DECK_SIZE / MAX_COPIES_PER_CARD);
