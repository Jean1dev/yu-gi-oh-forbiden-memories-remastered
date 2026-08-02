import {
  DomainError,
  err,
  ok,
  type ApplyResult,
  type DuelAction,
  type DuelState,
  type InitializationInput,
  type MatchOrchestrationInput,
  type Result,
} from "@yugioh/shared";

export type BuildInitializationInput = (
  input: Omit<MatchOrchestrationInput, "duelistId">,
  dependencies: unknown,
) => Result<InitializationInput, DomainError>;

export type InitDuel = (input: InitializationInput) => DuelState;
export type ApplyAction = (
  state: DuelState,
  action: DuelAction,
) => Result<ApplyResult, DomainError>;

export function createEngineFake(options: {
  readonly initialState: DuelState;
  readonly transitions?: readonly DuelState[];
  readonly rejectInitialization?: boolean;
}) {
  const transitions = [...(options.transitions ?? [])];
  const appliedActions: DuelAction[] = [];
  const buildInitializationInput: BuildInitializationInput = (input) =>
    options.rejectInitialization
      ? err(new DomainError("Rejected by engine", "invalid_deck"))
      : ok({
          players: { P1: { cards: [] }, P2: { cards: [] } },
          seed: input.seed ?? options.initialState.seed,
        });
  const apply: ApplyAction = (state, action) => {
    appliedActions.push(action);
    return ok({ state: transitions.shift() ?? state, events: [] });
  };
  const closeReactionWindow = (state: DuelState): Result<DuelState, DomainError> => {
    const { pending: _pending, ...next } = state;
    void _pending;
    return ok(next);
  };
  return {
    appliedActions,
    buildInitializationInput,
    initDuel: () => options.initialState,
    apply,
    closeReactionWindow,
  };
}
