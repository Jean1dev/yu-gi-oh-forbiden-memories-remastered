import type { CardNumber } from "../card/types.ts";

/**
 * Forward-declared cross-PRD contract (motor-duelo-1x1/F03, "assuma os
 * contratos externos" override): the canonical shape of a player's deck,
 * `numero -> quantity`, owned by `free-duel`/F02
 * (`docs/specs/free-duel/F02-verificacao-do-deck-ativo/spec.md`), not yet
 * implemented. Declared here as a type only — no validation logic lives in
 * this package.
 */
export type DeckComposition = Readonly<Record<CardNumber, number>>;

/**
 * The closed vocabulary of deck-structure violations (`free-duel`/F02 spec,
 * §3 "ViolacaoDeck"). Forward-declared for the same reason as
 * `DeckComposition`.
 */
export type DeckViolation =
  | Readonly<{ type: "insufficient_size"; total: number; missing: number }>
  | Readonly<{ type: "excessive_size"; total: number; excess: number }>
  | Readonly<{ type: "copies_exceeded"; cardNumber: CardNumber; quantity: number }>
  | Readonly<{ type: "invalid_quantity"; cardNumber: CardNumber; quantity: number }>
  | Readonly<{ type: "unknown_card"; cardNumber: CardNumber }>;

/**
 * A deck confirmed valid: exactly 40 `cardNumbers` in deterministic
 * ascending order, one entry per copy (`free-duel`/F02 spec, §3
 * "DeckPronto"). Forward-declared for the same reason as `DeckComposition`.
 */
export type ReadyDeck = Readonly<{
  composition: DeckComposition;
  cardNumbers: readonly CardNumber[];
  total: number;
}>;
