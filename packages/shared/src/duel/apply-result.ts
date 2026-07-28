import type { DuelEvent } from "./events.ts";
import type { DuelState } from "./types.ts";

/**
 * The pair every future duel action (F06-F12) returns when applying a change:
 * the new state plus the ordered list of events it emitted
 * (`docs/arquitetura.md` §3.1). Not to be confused with the generic
 * `Result<T, E>` in `../result.ts`, which carries success/failure — this pair
 * always succeeds and carries the two halves of a state transition instead.
 */
export type ApplyResult = Readonly<{
  state: DuelState;
  events: readonly DuelEvent[];
}>;
