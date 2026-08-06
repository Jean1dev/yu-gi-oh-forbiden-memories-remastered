import type {
  ApplyResult,
  DomainError,
  DuelAction,
  DuelState,
  EvaluateAiCandidate,
  GetPublicDuelState,
  PublicDuelState,
  Result,
} from "@yugioh/shared";

type ApplyAction = (state: DuelState, action: DuelAction) => Result<ApplyResult, DomainError>;

export type AiDecisionContext = Readonly<{ close(): void }>;

export type AiCandidateEvaluator = Readonly<{
  open(publicState: PublicDuelState, privateState: DuelState): AiDecisionContext;
  evaluate: EvaluateAiCandidate;
}>;

export function createAiCandidateEvaluator(
  dependencies: Readonly<{
    apply: ApplyAction;
    getPublicDuelState: GetPublicDuelState;
  }>,
): AiCandidateEvaluator {
  const contexts = new WeakMap<PublicDuelState, { state: DuelState; active: boolean }>();
  return {
    open(publicState, privateState) {
      const context = { state: privateState, active: true };
      contexts.set(publicState, context);
      return {
        close() {
          context.active = false;
        },
      };
    },
    evaluate(publicState, action) {
      const context = contexts.get(publicState);
      if (context === undefined) return { kind: "unavailable", code: "unknown_public_state" };
      if (!context.active) return { kind: "unavailable", code: "expired_decision_context" };
      const result = dependencies.apply(context.state, action);
      return result.ok
        ? {
            kind: "accepted",
            resultingState: dependencies.getPublicDuelState(result.value.state, "P2"),
          }
        : { kind: "rejected" };
    },
  };
}
