import { OPPONENT_SELECTION_MESSAGES } from "../../lib/free-duel/opponent-selection-messages.ts";

export function RosterUnavailable({ onRetry }: { onRetry(): void }) {
  return (
    <main className="page">
      <h1>{OPPONENT_SELECTION_MESSAGES.unavailableTitle}</h1>
      <p>{OPPONENT_SELECTION_MESSAGES.unavailableMessage}</p>
      <button type="button" onClick={onRetry}>
        {OPPONENT_SELECTION_MESSAGES.retry}
      </button>
    </main>
  );
}
