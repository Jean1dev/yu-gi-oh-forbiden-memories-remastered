import type { PlayerId } from "./player.ts";

/**
 * Why a duel ended with a winner (motor-duelo-1x1 F12). `deck_out` is the
 * player who could not complete a mandatory draw (F07), not whoever holds
 * fewer cards.
 */
export type DecisiveDuelEndReason = "lp_depleted" | "deck_out" | "surrender";

/** Every way a duel can end, including the drawn one. */
export type DuelEndReason = DecisiveDuelEndReason | "draw";

/**
 * The result of a finished duel: who won, who lost and why (motor-duelo-1x1
 * F12 Provides). Lives here rather than in `./result.ts` so that
 * `DuelState.outcome` can reference it without the two modules importing each
 * other — this file depends only on `./player.ts`.
 *
 * A draw carries `winner`/`loser` as `null` rather than omitting them, so both
 * variants have the same keys and a consumer can read `outcome.winner`
 * without narrowing first.
 */
export type DuelOutcome =
  | Readonly<{
      status: "decisive";
      winner: PlayerId;
      loser: PlayerId;
      reason: DecisiveDuelEndReason;
    }>
  | Readonly<{
      status: "draw";
      winner: null;
      loser: null;
      reason: "draw";
    }>;
