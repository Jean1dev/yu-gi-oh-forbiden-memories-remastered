import type { CardNumber } from "../card/types.ts";
import type { DropTierId } from "./types.ts";

/**
 * Where the granted card came from: the resolved tier's own pool, or the
 * fallback common pool used when that tier has no candidates for this
 * duelist (spec free-duel/F06, Decision 4).
 */
export type DropRewardSource = "duelist_pool" | "default_common_pool";

/** What the pure selection in `packages/rules` hands back to the caller. */
export type DropRewardOutcome = Readonly<{
  cardNumber: CardNumber;
  source: DropRewardSource;
  /** The tier that was requested, preserved even when `source` is the fallback. */
  tier: DropTierId;
}>;

/**
 * The catalog-wide fallback pool used when a duelist's pool has no
 * candidates for the resolved tier. A balancing datum to be defined
 * (spec free-duel/F06, Decision 4/5) — schema and loader exist here, no
 * concrete card is chosen by this package.
 */
export type DefaultCommonDropPool = readonly CardNumber[];

/**
 * Relative weight for a candidate card, `> 0` and finite. Absent from a call
 * site means uniform weighting (spec free-duel/F06, Decision 3) — no
 * concrete weight is hard-coded anywhere in `packages/rules`.
 */
export type CardWeightLookup = (cardNumber: CardNumber) => number;
