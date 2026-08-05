"use client";

import type {
  Card,
  ConsolidatedDuelResult,
  DomainError,
  DuelState,
  DropPool,
  DuelSession,
  Duelist,
  ReadyDeck,
  Result,
  CompleteFusionAction,
} from "@yugioh/shared";
import { spellPlayMode } from "@yugioh/shared";
import { getPublicDuelState } from "@yugioh/rules";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DuelActions } from "../../../../components/free-duel/duel-actions.tsx";
import { DuelBoard } from "../../../../components/free-duel/duel-board.tsx";
import { DuelCardPreview } from "../../../../components/free-duel/duel-card-preview.tsx";
import { DuelHandBar } from "../../../../components/free-duel/duel-hand-bar.tsx";
import { DuelMessage } from "../../../../components/free-duel/duel-message.tsx";
import { DuelPrompt } from "../../../../components/free-duel/duel-prompt.tsx";
import { DuelResultOverlay } from "../../../../components/free-duel/duel-result-overlay.tsx";
import { DuelUnavailableNotice } from "../../../../components/free-duel/duel-unavailable-notice.tsx";
import { OrchestrationFailureNotice } from "../../../../components/free-duel/orchestration-failure-notice.tsx";
import { PlayerHand } from "../../../../components/free-duel/player-hand.tsx";
import { PostDuelActions } from "../../../../components/free-duel/post-duel-actions.tsx";
import { SurrenderButton } from "../../../../components/free-duel/surrender-button.tsx";
import { SurrenderConfirmationDialog } from "../../../../components/free-duel/surrender-confirmation-dialog.tsx";
import { DuelTopBar } from "../../../../components/free-duel/duel-top-bar.tsx";
import { useAutoAdvancePhase } from "../../../../hooks/use-auto-advance-phase.ts";
import { useDuelCues } from "../../../../hooks/use-duel-cues.ts";
import { DuelResult } from "../../../../components/free-duel/duel-result.tsx";
import { useDuelInteraction } from "../../../../hooks/use-duel-interaction.ts";
import { useVictoryReward } from "../../../../hooks/use-victory-reward.ts";
import type { GrantedVictoryReward } from "../../../../lib/free-duel/grant-victory-reward.ts";
import { useDuelResult, type ResolveEndedDuelResult } from "../../../../hooks/use-duel-result.ts";
import { useDuelSession, type StartDuelMatch } from "../../../../hooks/use-duel-session.ts";
import { useSurrender } from "../../../../hooks/use-surrender.ts";
import type {
  CreateDuelRuntimeInput,
  DuelRuntime,
} from "../../../../lib/free-duel/duel-runtime.ts";
import { getRefusalMessage } from "../../../../lib/free-duel/duel-action-messages.ts";
import { DUEL_SCREEN_MESSAGES } from "../../../../lib/free-duel/duel-screen-messages.ts";
import type { ApplyAction } from "../../../../lib/free-duel/duel-session.ts";
import { takeDuelHandoff } from "../../../../lib/free-duel/duel-handoff.ts";
import { loadClientRoster } from "../../../../lib/free-duel/load-client-roster.ts";
import styles from "./duel-screen.module.css";

export type DuelScreenContext = Readonly<{ duelist: Duelist; playerDeck: ReadyDeck }>;
export type DuelScreenCatalogResult =
  Readonly<{ status: "ready"; cards: readonly Card[] }> | Readonly<{ status: "error" }>;

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

function selectedHandIndex(intent: ReturnType<typeof useDuelInteraction>["intent"]): number | null {
  switch (intent.kind) {
    case "card_selected":
    case "choosing_zone":
    case "choosing_position":
      return intent.handIndex;
    default:
      return null;
  }
}

function selectedCard(
  state: DuelState | null,
  intent: ReturnType<typeof useDuelInteraction>["intent"],
): Card | null {
  const handIndex = selectedHandIndex(intent);
  return state && handIndex !== null ? (state.players.P1.hand[handIndex] ?? null) : null;
}

/** Mounted only once the result is resolved, so its hooks never run against a placeholder result. */
function ResolvedDuelResult({
  result,
  dropPool,
  grantVictoryReward,
  cards,
}: {
  readonly result: ConsolidatedDuelResult;
  readonly dropPool: DropPool;
  readonly grantVictoryReward?: GrantVictoryRewardForVictory | undefined;
  readonly cards: readonly Card[];
}) {
  const boundGrantReward = useMemo(() => {
    if (!grantVictoryReward) return undefined;
    return (victory: Extract<ConsolidatedDuelResult, { status: "victory" }>) =>
      grantVictoryReward(victory, dropPool);
  }, [grantVictoryReward, dropPool]);
  const victoryRewardState = useVictoryReward(result, boundGrantReward);
  const rewardCard =
    victoryRewardState.status === "granted"
      ? cards.find(({ numero }) => numero === victoryRewardState.granted.outcome.cardNumber)
      : undefined;
  return (
    <DuelResult
      result={result}
      victoryRewardState={victoryRewardState}
      rewardCard={rewardCard}
    />
  );
}

function EndedDuelResult({
  session,
  resolveResult,
  dropPool,
  grantVictoryReward,
  cards,
}: {
  readonly session: Extract<DuelSession, { status: "ended" }>;
  readonly resolveResult?: ResolveEndedDuelResult | undefined;
  readonly dropPool: DropPool;
  readonly grantVictoryReward?: GrantVictoryRewardForVictory | undefined;
  readonly cards: readonly Card[];
}) {
  const viewState = useDuelResult(session, resolveResult);
  return viewState.status === "loading" ? (
    <p aria-busy="true">Apurando resultado…</p>
  ) : (
    <ResolvedDuelResult
      result={viewState.result}
      dropPool={dropPool}
      grantVictoryReward={grantVictoryReward}
      cards={cards}
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
  autoAdvanceDelayMs,
}: {
  readonly duelistId: string;
  readonly catalogResult?: DuelScreenCatalogResult;
  readonly loadContext?: (duelistId: string) => Promise<DuelScreenContext | null>;
  readonly startMatch?: StartDuelMatch | undefined;
  readonly applyAction?: ApplyAction;
  readonly createRuntime?: ((input: CreateDuelRuntimeInput) => DuelRuntime) | undefined;
  readonly resolveResult?: ResolveEndedDuelResult | undefined;
  readonly grantVictoryReward?: GrantVictoryRewardForVictory | undefined;
  /** Draw/end auto-advance delay; only ever overridden by tests (default 1000ms). */
  readonly autoAdvanceDelayMs?: number | undefined;
}) {
  const [fusionMode, setFusionMode] = useState(false);
  const [fusionIndexes, setFusionIndexes] = useState<readonly number[]>([]);
  const router = useRouter();
  const cues = useDuelCues();
  const duel = useDuelSession({
    duelistId,
    catalogCards: catalogResult.status === "ready" ? catalogResult.cards : [],
    loadContext,
    onMissingContext: () => router.replace("/free-duel"),
    enabled: catalogResult.status === "ready",
    startMatch,
    createRuntime,
    onEvents: cues.enqueue,
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
  const activeState =
    session.status === "in_progress"
      ? session.state
      : session.status === "ended"
        ? session.finalState
        : null;
  const interactionState = session.status === "in_progress" ? session.state : null;
  const isPlayerTurn = session.status === "in_progress" && session.currentDecider === "P1";
  const interaction = useDuelInteraction({
    state: interactionState,
    isPlayerTurn,
    busy: duel.busy || cues.busy,
    dispatch: (action) => void duel.submitAction(action),
  });
  const selectedIndex = selectedHandIndex(interaction.intent);
  const previewCard = selectedCard(activeState, interaction.intent);
  const messageText = duel.lastRefusal
    ? getRefusalMessage(duel.lastRefusal)
    : session.status === "in_progress" && !isPlayerTurn
      ? DUEL_SCREEN_MESSAGES.opponentTurn
      : null;

  useAutoAdvancePhase({
    phase: session.status === "in_progress" ? session.state.phase : null,
    active:
      session.status === "in_progress" &&
      isPlayerTurn &&
      !duel.busy &&
      !cues.busy &&
      session.state.pendingFusion === undefined,
    dispatch: (action) => void duel.submitAction(action),
    delayMs: autoAdvanceDelayMs,
  });

  useEffect(() => {
    if (session.status === "ended") cues.clear();
  }, [cues, session.status]);

  if (catalogResult.status === "error") return <DuelUnavailableNotice />;
  if (session.status === "not_started")
    return (
      <main className={styles.loading} aria-busy="true">
        Iniciando duelo...
      </main>
    );
  if (session.status === "failed") {
    return (
      <main className={styles.failed}>
        <OrchestrationFailureNotice reason={session.reason} />
      </main>
    );
  }
  if (activeState === null)
    return (
      <main className={styles.loading} aria-busy="true">
        Iniciando duelo...
      </main>
    );
  const state = activeState;
  const view = getPublicDuelState(state, "P1");
  const pendingFusion = state.pendingFusion;
  const completeFusion = () => {
    if (!pendingFusion) return;
    const card = pendingFusion.resultCard;
    let placement: CompleteFusionAction["placement"];
    if (card.tipo === "monstro" || card.tipo === "ritual") {
      const zoneIndex = state.players.P1.field.monsters.findIndex((zone) => !zone.occupied);
      if (zoneIndex < 0 || zoneIndex > 4) return;
      placement = {
        kind: "monster",
        zoneIndex: zoneIndex as 0 | 1 | 2 | 3 | 4,
        position: "attack_face_up",
      };
    } else {
      const mode = spellPlayMode(card);
      if (mode === "one_shot") placement = { kind: "activate_spell" };
      else if (mode === "terrain") placement = { kind: "field_spell" };
      else if (mode === "equip") {
        const targetIndex = state.players.P1.field.monsters.findIndex((zone) => zone.occupied);
        if (targetIndex < 0 || targetIndex > 4) return;
        placement = {
          kind: "equip",
          targetZone: {
            player: "P1",
            zoneType: "monster",
            index: targetIndex as 0 | 1 | 2 | 3 | 4,
          },
        };
      } else {
        const zoneIndex = state.players.P1.field.spells.findIndex((zone) => !zone.occupied);
        if (zoneIndex < 0 || zoneIndex > 4) return;
        placement = { kind: "spell_or_trap", zoneIndex: zoneIndex as 0 | 1 | 2 | 3 | 4 };
      }
    }
    void duel.submitAction({ type: "complete_fusion", placement });
  };
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Duelo</h1>
      <DuelTopBar
        terrainName={state.activeField?.nome ?? null}
        phase={state.phase}
        turn={state.turn}
        onExit={surrenderFlow.requestConfirmation}
      >
        <SurrenderButton
          available={surrenderFlow.available}
          onClick={surrenderFlow.requestConfirmation}
        />
      </DuelTopBar>
      <DuelBoard
        view={view}
        interactive={session.status === "in_progress" && isPlayerTurn && !duel.busy && !cues.busy}
        zoneAffordance={interaction.affordanceFor}
        cueFor={cues.cueFor}
        cueForPlayer={cues.cueForPlayer}
        onZoneActivate={interaction.onZoneActivate}
      />
      <DuelMessage text={messageText} tone={duel.lastRefusal ? "refusal" : "info"} />
      {session.status === "in_progress" ? (
        <>
          <DuelPrompt
            intent={interaction.intent}
            onChoosePosition={interaction.onChoosePosition}
            onCancel={interaction.reset}
          />
          <DuelHandBar>
            {pendingFusion ? (
              <section aria-live="polite">
                <p>Resultado: {pendingFusion.resultCard.nome}</p>
                <ol>
                  {pendingFusion.resolution.steps.map((step, index) => (
                    <li key={index}>
                      {step.accumulator} + {step.material} → {step.result ?? step.material}
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={completeFusion}>
                  Colocar fusão
                </button>
              </section>
            ) : null}
            <PlayerHand
              cards={state.players.P1.hand}
              disabled={!isPlayerTurn || duel.busy || cues.busy || pendingFusion !== undefined}
              selectedIndex={selectedIndex}
              selectedIndices={fusionIndexes}
              drawnCount={cues.cueForPlayer("P1")?.kind === "draw" ? 1 : 0}
              onSelect={(index) =>
                fusionMode
                  ? setFusionIndexes((current) =>
                      current.includes(index)
                        ? current.filter((value) => value !== index)
                        : current.length < 5
                          ? [...current, index]
                          : current,
                    )
                  : interaction.onSelectHandCard(index)
              }
            />
            <div>
              <button
                type="button"
                disabled={
                  pendingFusion !== undefined ||
                  state.phase !== "main" ||
                  state.players.P1.handPlayUsed
                }
                onClick={() => {
                  setFusionMode((value) => !value);
                  setFusionIndexes([]);
                }}
              >
                {fusionMode ? "Cancelar fusão" : "Fundir"}
              </button>
              {fusionMode ? (
                <button
                  type="button"
                  disabled={fusionIndexes.length < 2}
                  onClick={() => {
                    void duel.submitAction({
                      type: "begin_fusion",
                      player: "P1",
                      handIndexes: fusionIndexes,
                    });
                    setFusionMode(false);
                    setFusionIndexes([]);
                  }}
                >
                  Confirmar fusão
                </button>
              ) : null}
            </div>
            <DuelActions slots={interaction.slots} onInvoke={interaction.onInvokeSlot} />
          </DuelHandBar>
          <DuelCardPreview card={previewCard} />
        </>
      ) : null}
      <SurrenderConfirmationDialog
        open={surrenderFlow.confirmationOpen}
        onConfirm={surrenderFlow.confirm}
        onCancel={surrenderFlow.cancel}
      />
      {session.status === "ended" ? (
        <DuelResultOverlay>
          <EndedDuelResult
            session={session}
            resolveResult={effectiveResolveResult}
            dropPool={duel.context?.duelist.dropPool ?? []}
            grantVictoryReward={grantVictoryReward}
            cards={catalogResult.status === "ready" ? catalogResult.cards : []}
          />
          <PostDuelActions duelistId={duelistId} />
        </DuelResultOverlay>
      ) : null}
    </main>
  );
}
