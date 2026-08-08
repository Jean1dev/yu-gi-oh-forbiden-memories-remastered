import { FM_DROP_TIERS, type DuelGrade, type RatingReward } from "@yugioh/shared";

/**
 * What each grade is worth (rating-engine F03): the original's star chips, 1 to
 * 5, and which of the duelist's three drop pools it opens.
 *
 * The star count is not a balancing knob. `password/F02` carried "the value of
 * N stars per victory" as a pending decision; it was never a decision to make —
 * it is the original's star chip reward, recovered together with the score
 * tables of F02 and from the same crossed sources.
 *
 * Only `S` and `A` open a rare pool, and they do so on both sides of the axis:
 * the score is a single line where the middle is easy and both ends are
 * deliberate, so the reward follows distance from the centre rather than the
 * raw score. `S-TEC` and `S-POW` are equally hard and equally paid.
 *
 * Typed as a `Record` over the closed `DuelGrade` rather than written as a
 * `switch`: a grade added to the scale without an entry here is a compile
 * error, which is the whole point of narrowing `DuelGrade` in F02.
 */
export const GRADE_REWARDS: Readonly<Record<DuelGrade, RatingReward>> = {
  "S-TEC": { stars: 5, dropTier: FM_DROP_TIERS.SA_TEC },
  "A-TEC": { stars: 4, dropTier: FM_DROP_TIERS.SA_TEC },
  "B-TEC": { stars: 3, dropTier: FM_DROP_TIERS.COMMON },
  "C-TEC": { stars: 2, dropTier: FM_DROP_TIERS.COMMON },
  "D-TEC": { stars: 1, dropTier: FM_DROP_TIERS.COMMON },
  "D-POW": { stars: 1, dropTier: FM_DROP_TIERS.COMMON },
  "C-POW": { stars: 2, dropTier: FM_DROP_TIERS.COMMON },
  "B-POW": { stars: 3, dropTier: FM_DROP_TIERS.COMMON },
  "A-POW": { stars: 4, dropTier: FM_DROP_TIERS.SA_POW },
  "S-POW": { stars: 5, dropTier: FM_DROP_TIERS.SA_POW },
};

/**
 * The reward for a grade. Total by construction — every grade has an entry, so
 * there is no failure path and no `Result` to unwrap.
 *
 * Decides the *pool*, never the card: the weighted draw inside the pool is
 * `free-duel/F06`. Reports the star count, never credits it: the atomic,
 * duel-idempotent credit is `free-duel/F07`.
 */
export function rewardForGrade(grade: DuelGrade): RatingReward {
  return GRADE_REWARDS[grade];
}
