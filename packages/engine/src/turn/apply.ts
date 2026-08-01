import { DomainError, err, ok, type Action, type ApplyResult, type DuelState, type Result } from "@yugioh/shared";

import { hasOpenReactionWindow } from "../events/index.ts";
import { advancePhase } from "./advance-phase.ts";

/**
 * The engine's single entry point (`docs/arquitetura.md` §3.1): receives the
 * current state and a player/system action, and returns the new state plus
 * the events it emitted. An exhaustive `switch` on `action.type` — F07-F12
 * each add a `case` to this same function, never a separate dispatcher.
 */
export function apply(state: DuelState, action: Action): Result<ApplyResult, DomainError> {
  if (hasOpenReactionWindow(state)) {
    return err(
      new DomainError(
        "Não é possível avançar de fase com uma janela de reação aberta.",
        "reaction_window_open",
        { pendingEventType: state.pending?.event.type },
      ),
    );
  }

  switch (action.type) {
    case "advance_phase":
      return ok(advancePhase(state));
    default: {
      const exhaustive: never = action.type;
      throw new Error(`Unhandled action type: ${String(exhaustive)}`);
    }
  }
}
