"use client";

import type { DuelSession, Duelist, ReadyDeck } from "@yugioh/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DuelBoard } from "../../../../components/free-duel/duel-board.tsx";
import { OrchestrationFailureNotice } from "../../../../components/free-duel/orchestration-failure-notice.tsx";
import { PlayerHand } from "../../../../components/free-duel/player-hand.tsx";
import { SurrenderButton } from "../../../../components/free-duel/surrender-button.tsx";
import { SurrenderConfirmationDialog } from "../../../../components/free-duel/surrender-confirmation-dialog.tsx";
import { DuelResult } from "../../../../components/free-duel/duel-result.tsx";
import {
  useDuelResult,
  type ResolveEndedDuelResult,
} from "../../../../hooks/use-duel-result.ts";
import { useSurrender } from "../../../../hooks/use-surrender.ts";
import { buildMatchInput } from "../../../../lib/free-duel/build-match-input.ts";
import type { ApplyAction } from "../../../../lib/free-duel/duel-session.ts";
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

const unavailableApply: ApplyAction = () => {
  throw new Error("The duel engine apply contract is unavailable.");
};

function EndedDuelResult({
  session,
  resolveResult,
}: {
  readonly session: Extract<DuelSession, { status: "ended" }>;
  readonly resolveResult?: ResolveEndedDuelResult | undefined;
}) {
  const viewState = useDuelResult(session, resolveResult);
  return viewState.status === "loading" ? (
    <p aria-busy="true">Apurando resultado…</p>
  ) : (
    <DuelResult result={viewState.result} />
  );
}

export function DuelScreen({
  duelistId,
  loadContext = loadDefaultContext,
  startMatch = unavailableExternalModules,
  applyAction = unavailableApply,
  resolveResult,
}: {
  readonly duelistId: string;
  readonly loadContext?: (duelistId: string) => Promise<DuelScreenContext | null>;
  readonly startMatch?: (
    context: DuelScreenContext,
    input: ReturnType<typeof buildMatchInput>,
  ) => DuelSession | Promise<DuelSession>;
  readonly applyAction?: ApplyAction;
  readonly resolveResult?: ResolveEndedDuelResult | undefined;
}) {
  const router = useRouter();
  const [session, setSession] = useState<DuelSession>({ status: "not_started" });
  const matchStarted = useRef(false);
  const surrenderFlow = useSurrender({
    session,
    playerId: "P1",
    apply: applyAction,
    onSessionChange: setSession,
  });
  useEffect(() => {
    if (matchStarted.current) return;
    matchStarted.current = true;
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
      <SurrenderButton
        available={surrenderFlow.available}
        onClick={surrenderFlow.requestConfirmation}
      />
      <SurrenderConfirmationDialog
        open={surrenderFlow.confirmationOpen}
        onConfirm={surrenderFlow.confirm}
        onCancel={surrenderFlow.cancel}
      />
      {session.status === "ended" ? (
        <EndedDuelResult session={session} resolveResult={resolveResult} />
      ) : null}
    </main>
  );
}
