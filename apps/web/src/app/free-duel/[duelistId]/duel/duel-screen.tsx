"use client";

import type {
  ConsolidatedDuelResult,
  DomainError,
  DropPool,
  DuelSession,
  Duelist,
  ReadyDeck,
  Result,
} from "@yugioh/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DuelBoard } from "../../../../components/free-duel/duel-board.tsx";
import { OrchestrationFailureNotice } from "../../../../components/free-duel/orchestration-failure-notice.tsx";
import { PlayerHand } from "../../../../components/free-duel/player-hand.tsx";
import { SurrenderButton } from "../../../../components/free-duel/surrender-button.tsx";
import { SurrenderConfirmationDialog } from "../../../../components/free-duel/surrender-confirmation-dialog.tsx";
import { DuelResult } from "../../../../components/free-duel/duel-result.tsx";
import {
  useVictoryReward,
} from "../../../../hooks/use-victory-reward.ts";
import type { GrantedVictoryReward } from "../../../../lib/free-duel/grant-victory-reward.ts";
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

/** Bound with the duelist's `dropPool` at composition time; see `ResolvedDuelResult`. */
export type GrantVictoryRewardForVictory = (
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
  dropPool: DropPool,
) => Promise<Result<GrantedVictoryReward, DomainError>>;

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

/** Mounted only once the result is resolved, so its hooks never run against a placeholder result. */
function ResolvedDuelResult({
  result,
  dropPool,
  grantVictoryReward,
}: {
  readonly result: ConsolidatedDuelResult;
  readonly dropPool: DropPool;
  readonly grantVictoryReward?: GrantVictoryRewardForVictory | undefined;
}) {
  const boundGrantReward = useMemo(() => {
    if (!grantVictoryReward) return undefined;
    return (victory: Extract<ConsolidatedDuelResult, { status: "victory" }>) =>
      grantVictoryReward(victory, dropPool);
  }, [grantVictoryReward, dropPool]);
  const victoryRewardState = useVictoryReward(result, boundGrantReward);
  return <DuelResult result={result} victoryRewardState={victoryRewardState} />;
}

function EndedDuelResult({
  session,
  resolveResult,
  dropPool,
  grantVictoryReward,
}: {
  readonly session: Extract<DuelSession, { status: "ended" }>;
  readonly resolveResult?: ResolveEndedDuelResult | undefined;
  readonly dropPool: DropPool;
  readonly grantVictoryReward?: GrantVictoryRewardForVictory | undefined;
}) {
  const viewState = useDuelResult(session, resolveResult);
  return viewState.status === "loading" ? (
    <p aria-busy="true">Apurando resultado…</p>
  ) : (
    <ResolvedDuelResult
      result={viewState.result}
      dropPool={dropPool}
      grantVictoryReward={grantVictoryReward}
    />
  );
}

export function DuelScreen({
  duelistId,
  loadContext = loadDefaultContext,
  startMatch = unavailableExternalModules,
  applyAction = unavailableApply,
  resolveResult,
  grantVictoryReward,
}: {
  readonly duelistId: string;
  readonly loadContext?: (duelistId: string) => Promise<DuelScreenContext | null>;
  readonly startMatch?: (
    context: DuelScreenContext,
    input: ReturnType<typeof buildMatchInput>,
  ) => DuelSession | Promise<DuelSession>;
  readonly applyAction?: ApplyAction;
  readonly resolveResult?: ResolveEndedDuelResult | undefined;
  readonly grantVictoryReward?: GrantVictoryRewardForVictory | undefined;
}) {
  const router = useRouter();
  const [session, setSession] = useState<DuelSession>({ status: "not_started" });
  const [context, setContext] = useState<DuelScreenContext | null>(null);
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
    void loadContext(duelistId).then(async (loaded) => {
      if (!active) return;
      if (!loaded) {
        router.replace("/free-duel");
        return;
      }
      setContext(loaded);
      const input = buildMatchInput({
        duelistId,
        playerDeck: loaded.playerDeck,
        duelist: loaded.duelist,
      });
      const next = await startMatch(loaded, input);
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
        <EndedDuelResult
          session={session}
          resolveResult={resolveResult}
          dropPool={context?.duelist.dropPool ?? []}
          grantVictoryReward={grantVictoryReward}
        />
      ) : null}
    </main>
  );
}
