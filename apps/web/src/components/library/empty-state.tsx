import { LIBRARY_MESSAGES } from "./messages.ts";

/** Shown instead of the grid when the player has not obtained any card yet — a valid state, not an error. */
export function EmptyState() {
  return <p role="status">{LIBRARY_MESSAGES.emptyCollection}</p>;
}
