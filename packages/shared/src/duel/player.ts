/**
 * Split from `types.ts` so `events.ts` (needed by `types.ts` for the `pending`
 * field) can depend on `PlayerId` without the two files importing each other.
 */

/** One of the two sides of the duel. */
export type PlayerId = "P1" | "P2";
