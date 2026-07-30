import {
  DomainError,
  err,
  ok,
  type CardNumber,
  type CardWeightLookup,
  type DefaultCommonDropPool,
  type DropPool,
  type DropRewardOutcome,
  type DropTierId,
  type Result,
} from "@yugioh/shared";

import { deriveWeightedSelection } from "./deterministic-selection.ts";

const uniformWeight: CardWeightLookup = () => 1;

/**
 * Picks exactly one card for a victory (spec free-duel/F06 §3). Pure and
 * total: no I/O, no `Math.random()`, never throws — every failure mode is a
 * `Result` error. The same `(pool, tier, defaultCommonDropPool,
 * duelSessionId, weightLookup)` always yields the same outcome (Decision 6).
 *
 * `pool` is the already-resolved `DropPool` (this package never imports
 * `packages/data`, Decision 7); the one-liner filter by `tier` below
 * duplicates a trivial lookup, not a business rule.
 */
export function selectDropCardNumber(
  pool: DropPool,
  tier: DropTierId,
  defaultCommonDropPool: DefaultCommonDropPool,
  duelSessionId: string,
  weightLookup: CardWeightLookup = uniformWeight,
): Result<DropRewardOutcome, DomainError> {
  const tierCandidates = pool.find((entry) => entry.tier === tier)?.cardNumbers ?? [];

  const source = tierCandidates.length > 0 ? "duelist_pool" : "default_common_pool";
  const candidates: readonly CardNumber[] =
    tierCandidates.length > 0 ? tierCandidates : defaultCommonDropPool;

  if (candidates.length === 0) {
    return err(
      new DomainError(
        "No drop candidates are available for this tier or the default common pool.",
        "no_drop_candidates_available",
        { tier },
      ),
    );
  }

  const weights = candidates.map((cardNumber) => weightLookup(cardNumber));
  const index = deriveWeightedSelection(duelSessionId, weights);
  const cardNumber = candidates[index]!;

  return ok({ cardNumber, source, tier });
}
