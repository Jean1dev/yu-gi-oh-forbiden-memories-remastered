import { OPPONENT_SELECTION_MESSAGES } from "../../lib/free-duel/opponent-selection-messages.ts";

export function EmptyRosterState() {
  return <p>{OPPONENT_SELECTION_MESSAGES.emptyRoster}</p>;
}
