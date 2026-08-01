import {
  MAX_CPU_ACTIONS_PER_ADVANCE,
  type AiAgent,
  type ApplyResult,
  type CardCatalogLookup,
  type DifficultyProfile,
  type DomainError,
  type DuelAction,
  type DuelSession,
  type DuelState,
  type GetPublicDuelState,
  type InitializationInput,
  type MatchOrchestrationInput,
  type PlayerId,
  type Result,
} from "@yugioh/shared";

export type BuildInitializationInput = (
  input: {
    readonly compositionP1: MatchOrchestrationInput["playerComposition"];
    readonly compositionP2: MatchOrchestrationInput["cpuComposition"];
    readonly seed?: number | undefined;
  },
  dependencies: {
    readonly catalog: CardCatalogLookup;
    readonly seedGenerator: () => number;
    readonly validateDeck: unknown;
  },
) => Result<InitializationInput, DomainError>;

export type InitDuel = (input: InitializationInput) => DuelState;
export type ApplyAction = (state: DuelState, action: DuelAction) => ApplyResult;

export type CreateDuelSessionDependencies = Readonly<{
  buildInitializationInput: BuildInitializationInput;
  initDuel: InitDuel;
  seedGenerator: () => number;
  catalog: CardCatalogLookup;
  validateDeck: unknown;
  generateSessionId: () => string;
}>;

export type AdvanceCpuDependencies = Readonly<{
  apply: ApplyAction;
  aiAgent: AiAgent;
  getPublicDuelState: GetPublicDuelState;
  cpuProfile: DifficultyProfile;
  logIncident?:
    | ((incident: {
        readonly code: "ai_unavailable" | "no_progress_loop";
        readonly error?: unknown;
      }) => void)
    | undefined;
}>;

type ActiveDuelSession = Extract<DuelSession, { status: "in_progress" }>;

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
  try {
    for (let actionCount = 0; actionCount < MAX_CPU_ACTIONS_PER_ADVANCE; actionCount += 1) {
      if (current.state.outcome !== undefined) return finishOrContinue(current, current.state);
      if (nextDecider(current.state) === "P1") {
        return { ...current, currentDecider: "P1" };
      }
      const publicState = dependencies.getPublicDuelState(current.state, "P2");
      const action = await dependencies.aiAgent.decide(publicState, dependencies.cpuProfile);
      const result = dependencies.apply(current.state, action);
      const next = finishOrContinue(current, result.state);
      if (next.status !== "in_progress") return next;
      current = next;
    }
    dependencies.logIncident?.({ code: "no_progress_loop" });
    return {
      status: "failed",
      duelSessionId: current.duelSessionId,
      duelistId: current.duelistId,
      reason: "no_progress_loop",
    };
  } catch (error) {
    dependencies.logIncident?.({ code: "ai_unavailable", error });
    return {
      status: "failed",
      duelSessionId: current.duelSessionId,
      duelistId: current.duelistId,
      reason: "ai_unavailable",
    };
  }
}

export async function submitPlayerAction(
  session: ActiveDuelSession,
  action: DuelAction,
  dependencies: AdvanceCpuDependencies,
): Promise<DuelSession> {
  if (nextDecider(session.state) !== "P1") return session;
  try {
    const result = dependencies.apply(session.state, action);
    const next = finishOrContinue(session, result.state);
    return next.status === "in_progress" ? advanceCpuDecisions(next, dependencies) : next;
  } catch (error) {
    dependencies.logIncident?.({ code: "ai_unavailable", error });
    return {
      status: "failed",
      duelSessionId: session.duelSessionId,
      duelistId: session.duelistId,
      reason: "ai_unavailable",
    };
  }
}

export function interruptDuelSession(
  session: ActiveDuelSession,
  action: DuelAction,
  dependencies: Pick<AdvanceCpuDependencies, "apply">,
): DuelSession {
  return finishOrContinue(session, dependencies.apply(session.state, action).state);
}
