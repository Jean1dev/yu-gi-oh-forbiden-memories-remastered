import {
  DomainError,
  MAX_CPU_ACTIONS_PER_ADVANCE,
  err,
  ok,
  type AiAgent,
  type ApplyResult,
  type CardCatalogLookup,
  type DeckComposition,
  type DifficultyProfile,
  type DuelAction,
  type DuelEvent,
  type DuelSession,
  type DuelState,
  type GetPublicDuelState,
  type InitializationInput,
  type MatchOrchestrationInput,
  type PlayerId,
  type ReadyDeck,
  type Result,
} from "@yugioh/shared";

export type BuildInitializationInput = (
  input: {
    readonly compositionP1: MatchOrchestrationInput["playerComposition"];
    readonly compositionP2: MatchOrchestrationInput["cpuComposition"];
    readonly seed?: number;
  },
  dependencies: {
    readonly catalog: CardCatalogLookup;
    readonly seedGenerator: () => number;
    readonly validateDeck: ValidateDeck;
  },
) => Result<InitializationInput, DomainError>;

export type InitDuel = (input: InitializationInput) => DuelState;
export type ApplyAction = (state: DuelState, action: DuelAction) => Result<ApplyResult, DomainError>;
export type CloseReactionWindow = (state: DuelState) => Result<DuelState, DomainError>;
export type ValidateDeck = (input: {
  readonly composition: DeckComposition;
  readonly catalog: CardCatalogLookup;
}) => Result<ReadyDeck, DomainError>;

export type CreateDuelSessionDependencies = Readonly<{
  buildInitializationInput: BuildInitializationInput;
  initDuel: InitDuel;
  seedGenerator: () => number;
  catalog: CardCatalogLookup;
  validateDeck: ValidateDeck;
  generateSessionId: () => string;
}>;

export type AdvanceCpuDependencies = Readonly<{
  apply: ApplyAction;
  closeReactionWindow: CloseReactionWindow;
  aiAgent: AiAgent;
  getPublicDuelState: GetPublicDuelState;
  cpuProfile: DifficultyProfile;
  onStep?:
    | ((step: { readonly session: DuelSession; readonly events: readonly DuelEvent[] }) => void)
    | undefined;
  logIncident?:
    | ((incident: {
        readonly code: "ai_unavailable" | "no_progress_loop";
        readonly error?: unknown;
      }) => void)
    | undefined;
}>;

export type PlayerActionOutcome = Readonly<{
  session: DuelSession;
  events: readonly DuelEvent[];
  refusal?: DomainError | undefined;
}>;

export type ActiveDuelSession = Extract<DuelSession, { status: "in_progress" }>;

export function nextDecider(state: DuelState): PlayerId {
  return state.pending?.reactingPlayer ?? state.activePlayer;
}

/**
 * A duel is over when the engine says so — `state.outcome` is what
 * motor-duelo-1x1/F12 stamps and freezes on. This deliberately does not look
 * at `state.phase`: `"end"` is the last phase of *every* turn, so testing it
 * would end the session at the close of turn 1.
 */
function finishOrContinue(session: ActiveDuelSession, state: DuelState): DuelSession {
  if (state.outcome !== undefined) {
    return {
      status: "ended",
      duelSessionId: session.duelSessionId,
      duelistId: session.duelistId,
      finalState: state,
    };
  }
  return { ...session, state, currentDecider: nextDecider(state) };
}

function notYourTurn(): DomainError {
  return new DomainError("The player cannot act during the opponent's turn.", "not_your_turn");
}

function failedSession(
  session: Pick<ActiveDuelSession, "duelSessionId" | "duelistId">,
  reason: "ai_unavailable" | "no_progress_loop",
): DuelSession {
  return {
    status: "failed",
    duelSessionId: session.duelSessionId,
    duelistId: session.duelistId,
    reason,
  };
}

function settlePendingWindow(
  applied: ApplyResult,
  dependencies: Pick<AdvanceCpuDependencies, "apply" | "closeReactionWindow">,
): Result<ApplyResult, DomainError> {
  let state = applied.state;
  const events = [...applied.events];

  for (let depth = 0; depth < MAX_CPU_ACTIONS_PER_ADVANCE; depth += 1) {
    if (state.pending === undefined) {
      return ok({ state, events });
    }

    if (state.pending.event.type === "onAttackDeclared") {
      const resolved = dependencies.apply(state, { type: "resolve_attack" });
      if (!resolved.ok) {
        return resolved;
      }
      state = resolved.value.state;
      events.push(...resolved.value.events);
      continue;
    }

    const closed = dependencies.closeReactionWindow(state);
    if (!closed.ok) {
      return closed;
    }
    state = closed.value;
  }

  return err(
    new DomainError("Reaction window settlement exceeded the orchestration guard.", "reaction_window_not_settled"),
  );
}

function applyAndSettle(
  state: DuelState,
  action: DuelAction,
  dependencies: Pick<AdvanceCpuDependencies, "apply" | "closeReactionWindow">,
): Result<ApplyResult, DomainError> {
  const applied = dependencies.apply(state, action);
  return applied.ok ? settlePendingWindow(applied.value, dependencies) : applied;
}

export function createDuelSession(
  input: MatchOrchestrationInput,
  dependencies: CreateDuelSessionDependencies,
): DuelSession {
  const duelSessionId = dependencies.generateSessionId();
  const initialization = dependencies.buildInitializationInput(
    {
      compositionP1: input.playerComposition,
      compositionP2: input.cpuComposition,
      ...(input.seed === undefined ? {} : { seed: input.seed }),
    },
    {
      catalog: dependencies.catalog,
      seedGenerator: dependencies.seedGenerator,
      validateDeck: dependencies.validateDeck,
    },
  );
  if (!initialization.ok) {
    return {
      status: "failed",
      duelSessionId,
      duelistId: input.duelistId,
      reason: "deck_rejected_by_engine",
    };
  }
  const state = dependencies.initDuel(initialization.value);
  return {
    status: "in_progress",
    duelSessionId,
    duelistId: input.duelistId,
    state,
    currentDecider: nextDecider(state),
  };
}

export async function advanceCpuDecisions(
  session: ActiveDuelSession,
  dependencies: AdvanceCpuDependencies,
): Promise<DuelSession> {
  let current: ActiveDuelSession = session;
  for (let actionCount = 0; actionCount < MAX_CPU_ACTIONS_PER_ADVANCE; actionCount += 1) {
    if (current.state.outcome !== undefined) return finishOrContinue(current, current.state);
    if (nextDecider(current.state) === "P1") {
      return { ...current, currentDecider: "P1" };
    }
    const publicState = dependencies.getPublicDuelState(current.state, "P2");
    let action: DuelAction;
    try {
      action = await dependencies.aiAgent.decide(publicState, dependencies.cpuProfile);
    } catch (error) {
      dependencies.logIncident?.({ code: "ai_unavailable", error });
      return failedSession(current, "ai_unavailable");
    }
    const result = applyAndSettle(current.state, action, dependencies);
    if (!result.ok) {
      dependencies.logIncident?.({ code: "ai_unavailable", error: result.error });
      return failedSession(current, "ai_unavailable");
    }
    const next = finishOrContinue(current, result.value.state);
    dependencies.onStep?.({ session: next, events: result.value.events });
    if (next.status !== "in_progress") return next;
    current = next;
  }
  dependencies.logIncident?.({ code: "no_progress_loop" });
  return failedSession(current, "no_progress_loop");
}

export async function submitPlayerAction(
  session: ActiveDuelSession,
  action: DuelAction,
  dependencies: AdvanceCpuDependencies,
): Promise<PlayerActionOutcome> {
  if (nextDecider(session.state) !== "P1") {
    return { session, events: [], refusal: notYourTurn() };
  }

  const result = applyAndSettle(session.state, action, dependencies);
  if (!result.ok) {
    return { session, events: [], refusal: result.error };
  }

  const next = finishOrContinue(session, result.value.state);
  const settledSession =
    next.status === "in_progress" ? await advanceCpuDecisions(next, dependencies) : next;
  return { session: settledSession, events: result.value.events };
}

export function interruptDuelSession(
  session: ActiveDuelSession,
  action: DuelAction,
  dependencies: Pick<AdvanceCpuDependencies, "apply">,
): DuelSession {
  const result = dependencies.apply(session.state, action);
  return result.ok ? finishOrContinue(session, result.value.state) : session;
}
