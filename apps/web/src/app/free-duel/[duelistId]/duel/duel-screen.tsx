"use client";

import type {
  Card,
  ConsolidatedDuelResult,
  DomainError,
  DropPool,
  DuelSession,
  Duelist,
  ReadyDeck,
  Result,
} from "@yugioh/shared";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DuelBoard } from "../../../../components/free-duel/duel-board.tsx";
import { DuelUnavailableNotice } from "../../../../components/free-duel/duel-unavailable-notice.tsx";
import { OrchestrationFailureNotice } from "../../../../components/free-duel/orchestration-failure-notice.tsx";
import { PlayerHand } from "../../../../components/free-duel/player-hand.tsx";
import { PostDuelActions } from "../../../../components/free-duel/post-duel-actions.tsx";
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
import {
  useDuelSession,
  type StartDuelMatch,
} from "../../../../hooks/use-duel-session.ts";
import { useSurrender } from "../../../../hooks/use-surrender.ts";
import type {
  CreateDuelRuntimeInput,
  DuelRuntime,
} from "../../../../lib/free-duel/duel-runtime.ts";
import type { ApplyAction } from "../../../../lib/free-duel/duel-session.ts";
import { takeDuelHandoff } from "../../../../lib/free-duel/duel-handoff.ts";
import { loadClientRoster } from "../../../../lib/free-duel/load-client-roster.ts";

export type DuelScreenContext = Readonly<{ duelist: Duelist; playerDeck: ReadyDeck }>;
export type DuelScreenCatalogResult =
  | Readonly<{ status: "ready"; cards: readonly Card[] }>
  | Readonly<{ status: "error" }>;

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
  catalogResult = { status: "ready", cards: [] },
  loadContext = loadDefaultContext,
  startMatch,
  applyAction,
  createRuntime,
  resolveResult,
  grantVictoryReward,
}: {
  readonly duelistId: string;
  readonly catalogResult?: DuelScreenCatalogResult;
  readonly loadContext?: (duelistId: string) => Promise<DuelScreenContext | null>;
  readonly startMatch?: StartDuelMatch | undefined;
  readonly applyAction?: ApplyAction;
  readonly createRuntime?: ((input: CreateDuelRuntimeInput) => DuelRuntime) | undefined;
  readonly resolveResult?: ResolveEndedDuelResult | undefined;
  readonly grantVictoryReward?: GrantVictoryRewardForVictory | undefined;
}) {
  const router = useRouter();
  const duel = useDuelSession({
    duelistId,
    catalogCards: catalogResult.status === "ready" ? catalogResult.cards : [],
    loadContext,
    onMissingContext: () => router.replace("/free-duel"),
    enabled: catalogResult.status === "ready",
    startMatch,
    createRuntime,
  });
  const session = duel.session;
  const effectiveApply = duel.applyAction ?? applyAction ?? unavailableApply;
  const effectiveResolveResult = resolveResult ?? duel.resolveResult;
  const surrenderFlow = useSurrender({
    session,
    playerId: "P1",
    apply: effectiveApply,
    onSessionChange: duel.replaceSession,
    onInterrupt: duel.applyAction ? duel.interrupt : undefined,
  });

  if (catalogResult.status === "error") return <DuelUnavailableNotice />;
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
        disabled={session.status === "ended" || session.currentDecider !== "P1" || duel.busy}
      />
      {session.status === "in_progress" ? (
        <button
          type="button"
          disabled={session.currentDecider !== "P1" || duel.busy}
          onClick={() => void duel.submitAction({ type: "advance_phase" })}
        >
          Passar Fase
        </button>
      ) : null}
      {duel.lastRefusal ? <p role="status">{duel.lastRefusal.code}</p> : null}
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
        <>
          <EndedDuelResult
            session={session}
            resolveResult={effectiveResolveResult}
            dropPool={duel.context?.duelist.dropPool ?? []}
            grantVictoryReward={grantVictoryReward}
          />
          <PostDuelActions duelistId={duelistId} />
        </>
      ) : null}
    </main>
  );
}
