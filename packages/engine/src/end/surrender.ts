import { ok, type ApplyResult, type DomainError, type DuelState, type Result, type SurrenderAction } from "@yugioh/shared";

import { getOpponent } from "../spells/opponent.ts";

/**
 * Concedes the duel on behalf of `action.player` (motor-duelo-1x1 F12).
 *
 * Everything else in the state — life points, field, hands, turn, phase and
 * even an open reaction window — is left exactly as it was, so the frozen
 * state stays a faithful picture of the moment the player gave up, for the
 * snapshot (F05) and for the result screen.
 *
 * Emits no events: the closed vocabulary of ten trigger types has nothing
 * meaning "the duel ended" (spec Decision 4), and the outcome is observable
 * in the state itself.
 *
 * `apply` has already refused the action if the duel was over, and
 * `SurrenderActionSchema` has already rejected a non-player at the boundary,
 * so this never fails today — it returns `Result` to stay uniform with every
 * other action handler.
 */
export function surrender(
  state: DuelState,
  action: SurrenderAction,
): Result<ApplyResult, DomainError> {
  return ok({
    state: {
      ...state,
      outcome: {
        status: "decisive",
        winner: getOpponent(action.player),
        loser: action.player,
        reason: "surrender",
      },
    } satisfies DuelState,
    events: [],
  });
}
