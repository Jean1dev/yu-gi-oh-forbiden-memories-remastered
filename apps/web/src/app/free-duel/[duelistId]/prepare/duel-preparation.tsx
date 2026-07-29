"use client";

import { useRouter } from "next/navigation";
import { DeckBlock } from "../../../../components/free-duel/deck-block.tsx";
import { DeckLoadFailure } from "../../../../components/free-duel/deck-load-failure.tsx";
import { useActiveDeckVerification } from "../../../../hooks/use-active-deck-verification.ts";
import {
  INVALID_DECK_MESSAGE,
  MISSING_DECK_MESSAGE,
} from "../../../../lib/free-duel/deck-messages.ts";
import { useSession } from "../../../../hooks/use-session.ts";

export function DuelPreparation({ duelistId }: { duelistId: string }) {
  const router = useRouter();
  const session = useSession();
  const playerId =
    session.status === "guest" || session.status === "authenticated" ? session.playerId : undefined;
  const { state, retry } = useActiveDeckVerification(playerId);
  if (state.status === "loading") return <main aria-busy="true">Checking active deck…</main>;
  const verification = state.verification;
  if (verification.status === "blocked") {
    return (
      <DeckBlock
        message={
          verification.reason === "missing_deck" ? MISSING_DECK_MESSAGE : INVALID_DECK_MESSAGE
        }
        violations={verification.violations}
      />
    );
  }
  if (verification.status === "unavailable") return <DeckLoadFailure onRetry={retry} />;
  return (
    <main>
      <h1>Deck ready</h1>
      <button type="button" onClick={() => router.push(`/free-duel/${duelistId}/duel`)}>
        Start duel
      </button>
    </main>
  );
}
