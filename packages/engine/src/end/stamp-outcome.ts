import type { ApplyResult } from "@yugioh/shared";

import { checkDuelEnd } from "./check-duel-end.ts";

/**
 * `apply`'s post-step (motor-duelo-1x1 F12): the single place where a duel is
 * declared over. Every successful branch of the dispatcher passes through
 * here, so no action — present or future — can end a duel without freezing it,
 * or forget to check.
 *
 * Idempotent, and it never overwrites: an outcome already present on the
 * state wins, which is what lets `surrender` declare its own result (spec
 * Decision 3). Events are passed through untouched — the outcome adds none.
 */
export function stampOutcome(result: ApplyResult): ApplyResult {
  if (result.state.outcome !== undefined) return result;

  const outcome = checkDuelEnd(result.state);
  if (outcome === undefined) return result;

  return { ...result, state: { ...result.state, outcome } };
}
