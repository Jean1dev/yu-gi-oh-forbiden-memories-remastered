export function RosterUnavailable({ onRetry }: { onRetry(): void }) {
  return (
    <main>
      <h1>Free Duel unavailable</h1>
      <p>Could not load the card catalog. Try again.</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </main>
  );
}
