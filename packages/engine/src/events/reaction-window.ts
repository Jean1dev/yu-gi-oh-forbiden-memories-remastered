import { DomainError, err, ok, type DuelEvent, type DuelState, type PlayerId, type Result } from "@yugioh/shared";

/**
 * Pauses the flow: publishes `event` and suspends `state` until
 * `closeReactionWindow` is called. Only one reaction window can be pending at
 * a time — `pending` is a single field, not a stack.
 */
export function openReactionWindow(
  state: DuelState,
  event: DuelEvent,
  reactingPlayer: PlayerId,
): Result<DuelState, DomainError> {
  if (state.pending !== undefined) {
    return err(
      new DomainError(
        "A reaction window is already open.",
        "reaction_window_already_open",
        { pendingEventType: state.pending.event.type },
      ),
    );
  }

  return ok({
    ...state,
    pending: { type: "reaction_window", event, reactingPlayer },
  });
}

/**
 * Resumes the flow: removes `pending` from `state`. Never transforms the
 * event it carried.
 */
export function closeReactionWindow(state: DuelState): Result<DuelState, DomainError> {
  if (state.pending === undefined) {
    return err(new DomainError("No reaction window is open.", "no_reaction_window_open"));
  }

  const { pending: _pending, ...rest } = state;
  void _pending;
  return ok(rest);
}

/** Guard that F06-F12 must consult before accepting a new player action. */
export function hasOpenReactionWindow(state: DuelState): boolean {
  return state.pending !== undefined;
}
