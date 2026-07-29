import { LOAD_FAILED_MESSAGE } from "../../lib/free-duel/deck-messages.ts";

export function DeckLoadFailure({ onRetry }: { onRetry(): void }) {
  return (
    <section role="alert">
      <p>{LOAD_FAILED_MESSAGE}</p>
      <button type="button" onClick={onRetry}>
        Tentar novamente
      </button>
    </section>
  );
}
