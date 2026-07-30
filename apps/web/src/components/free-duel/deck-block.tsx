import Link from "next/link";
import type { DeckViolation } from "@yugioh/shared";
import { formatDeckViolation } from "../../lib/free-duel/deck-messages.ts";

export function DeckBlock({
  message,
  violations,
}: {
  message: string;
  violations: readonly DeckViolation[];
}) {
  return (
    <section role="alert">
      <h1>Deck unavailable</h1>
      <p>{message}</p>
      {violations.length > 0 ? (
        <ul>
          {violations.map((entry) => (
            <li key={JSON.stringify(entry)}>{formatDeckViolation(entry)}</li>
          ))}
        </ul>
      ) : null}
      <Link href="/build-deck">Ir para Build Deck</Link>
    </section>
  );
}
