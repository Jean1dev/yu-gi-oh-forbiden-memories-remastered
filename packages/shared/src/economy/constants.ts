/**
 * Balance a new account's wallet starts with. PENDING BALANCING DATA
 * (`arquitetura.md` §10): `0` is the suggestion recorded in the PRD, not a
 * final value. This is the single place in the repository where the number
 * exists.
 */
export const INITIAL_WALLET_STARS = 0;

/** Defensive price used when a catalog card has no configured star price. */
export const UNPRICED_CARD_STARS = 999_999;

/** Number of digits in a card password before canonical grouping. */
export const PASSWORD_DIGIT_COUNT = 8;

/** Maximum raw input retained before password normalization. */
export const PASSWORD_MAX_INPUT_LENGTH = 32;
