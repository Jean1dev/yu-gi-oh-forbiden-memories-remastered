import type {
  ConsolidatedDuelResult,
  ConsolidatedRating,
  DuelOutcome,
} from "@yugioh/shared";

export type ConsolidateDuelResultInput = Readonly<{
  duelSessionId: string;
  outcome: DuelOutcome;
  rating: ConsolidatedRating | null;
}>;

export function consolidateDuelResult(
  input: ConsolidateDuelResultInput,
): ConsolidatedDuelResult {
  const { duelSessionId, outcome, rating } = input;
  if (outcome.status === "draw") {
    return { status: "draw", duelSessionId, reason: "draw" };
  }
  if (outcome.winner === "P1") {
    if (!rating) {
      return { status: "unavailable", duelSessionId, reason: "invalid_outcome" };
    }
    return { status: "victory", duelSessionId, reason: outcome.reason, rating };
  }
  if (outcome.loser === "P1") {
    return { status: "defeat", duelSessionId, reason: outcome.reason };
  }
  return { status: "unavailable", duelSessionId, reason: "invalid_outcome" };
}

