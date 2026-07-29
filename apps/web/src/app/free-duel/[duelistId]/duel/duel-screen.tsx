"use client";

import type { DuelSession, Duelist, ReadyDeck } from "@yugioh/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DuelBoard } from "../../../../components/free-duel/duel-board.tsx";
import { OrchestrationFailureNotice } from "../../../../components/free-duel/orchestration-failure-notice.tsx";
import { PlayerHand } from "../../../../components/free-duel/player-hand.tsx";
import { buildMatchInput } from "../../../../lib/free-duel/build-match-input.ts";
import { takeDuelHandoff } from "../../../../lib/free-duel/duel-handoff.ts";
import { loadClientRoster } from "../../../../lib/free-duel/load-client-roster.ts";
import { generateDuelSessionId } from "../../../../lib/free-duel/seed-generator.ts";

export type DuelScreenContext = Readonly<{ duelist: Duelist; playerDeck: ReadyDeck }>;

async function loadDefaultContext(duelistId: string): Promise<DuelScreenContext | null> {
  const handoff = takeDuelHandoff(duelistId);
  if (!handoff) return null;
  const loaded = await loadClientRoster();
  const duelist = loaded.roster?.duelists.find(({ id }) => id === duelistId);
  return duelist ? { duelist, playerDeck: handoff.playerDeck } : null;
}

function unavailableExternalModules(context: DuelScreenContext): DuelSession {
  return {
    status: "failed",
    duelSessionId: generateDuelSessionId(),
    duelistId: context.duelist.id,
    reason: "ai_unavailable",
  };
}

export function DuelScreen({
  duelistId,
  loadContext = loadDefaultContext,
  startMatch = unavailableExternalModules,
}: {
  readonly duelistId: string;
  readonly loadContext?: (duelistId: string) => Promise<DuelScreenContext | null>;
  readonly startMatch?: (
    context: DuelScreenContext,
    input: ReturnType<typeof buildMatchInput>,
  ) => DuelSession | Promise<DuelSession>;
}) {
  const router = useRouter();
  const [session, setSession] = useState<DuelSession>({ status: "not_started" });
  useEffect(() => {
    let active = true;
    void loadContext(duelistId).then(async (context) => {
      if (!active) return;
      if (!context) {
        router.replace("/free-duel");
        return;
      }
      const input = buildMatchInput({
        duelistId,
        playerDeck: context.playerDeck,
        duelist: context.duelist,
      });
      const next = await startMatch(context, input);
      if (active) setSession(next);
    });
    return () => {
      active = false;
    };
  }, [duelistId, loadContext, router, startMatch]);

  if (session.status === "not_started") return <main aria-busy="true">Starting duel…</main>;
  if (session.status === "failed") {
    return (
      <main>
        <OrchestrationFailureNotice reason={session.reason} />
      </main>
    );
  }
  const state = session.status === "ended" ? session.finalState : session.state;
  return (
    <main>
      <h1>Duel</h1>
      <DuelBoard state={state} />
      <PlayerHand
        cards={state.players.P1.hand}
        disabled={session.status === "ended" || session.currentDecider !== "P1"}
      />
      {session.status === "ended" ? <p>Duel ended.</p> : null}
    </main>
  );
}
