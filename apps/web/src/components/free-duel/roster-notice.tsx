import { OPPONENT_SELECTION_MESSAGES } from "../../lib/free-duel/opponent-selection-messages.ts";

export function RosterNotice() {
  return <p role="status">{OPPONENT_SELECTION_MESSAGES.cacheNotice}</p>;
}
