/**
 * The Forbidden Memories duel-score tables, transcribed from the original game
 * (rating-engine F02).
 *
 * PROVENANCE — these numbers are **not** balancing knobs and were not invented
 * here. Two independent public sources were crossed, and they validate each
 * other arithmetically:
 *
 * - The game's documented scoring bounds: the score starts at 50, the lowest
 *   theoretical total is -140 and the highest is +139.
 * - A community implementation of the same calculation, which publishes the
 *   per-parameter thresholds and point values below.
 *
 * The check that makes this a transcription rather than a guess: summing the
 * worst point of every parameter plus the worst win type gives exactly -140,
 * and summing the best of each gives exactly +139. A single mistyped digit
 * breaks one of the two. `fm-score-table.test.ts` runs that check.
 *
 * Reading rule: take the first index `i` where `value < thresholds[i]` and use
 * `points[i]`; a value at or above every threshold takes the last point. Both
 * ends saturate, so no counter needs an upper bound.
 */

/** Where every duel starts before any parameter is applied. */
export const BASE_SCORE = 50;

/**
 * One parameter of the formula. The tuple lengths are fixed so the compiler,
 * not a test, enforces "five point values for four thresholds".
 */
export type ScoreParameterTable = Readonly<{
  thresholds: readonly [number, number, number, number];
  points: readonly [number, number, number, number, number];
}>;

/**
 * How the duel ended, in the original's terms.
 *
 * `exodia` is recorded for fidelity and to make the +139 maximum check add up;
 * the engine has no Exodia, so nothing produces it today.
 */
export type DuelWinType = "annihilation" | "deck_out" | "exodia";

export const WIN_TYPE_POINTS: Readonly<Record<DuelWinType, number>> = {
  annihilation: 2,
  deck_out: -40,
  exodia: 40,
};

/**
 * The ten parameters, keyed by the name the score input uses.
 *
 * Note the shape of the "technical" parameters — fusions, equips, magics, traps
 * and face-down plays: their only non-negative bucket is "none at all", and
 * they fall off steeply from there. That is why a high `TEC` grade in the
 * original is reached by *accumulating penalty on purpose*, not by being
 * rewarded for technique. The table is faithful to that; it is not corrected.
 */
export const SCORE_PARAMETERS = {
  turns: { thresholds: [5, 9, 29, 33], points: [12, 8, 0, -8, -12] },
  effectiveAttacks: { thresholds: [2, 4, 10, 20], points: [4, 2, 0, -2, -4] },
  defensiveVictories: { thresholds: [2, 6, 10, 15], points: [0, -10, -20, -30, -40] },
  faceDownPlays: { thresholds: [1, 11, 21, 31], points: [0, -2, -4, -6, -8] },
  fusions: { thresholds: [1, 5, 10, 15], points: [4, 0, -4, -8, -12] },
  equips: { thresholds: [1, 5, 10, 15], points: [4, 0, -4, -8, -12] },
  pureMagics: { thresholds: [1, 4, 7, 10], points: [2, -4, -8, -12, -16] },
  triggeredTraps: { thresholds: [1, 3, 5, 7], points: [2, -8, -16, -24, -32] },
  remainingCards: { thresholds: [4, 8, 28, 32], points: [-7, -5, 0, 12, 15] },
  remainingLifePoints: { thresholds: [100, 1000, 7000, 8000], points: [-7, -5, 0, 4, 6] },
} as const satisfies Record<string, ScoreParameterTable>;

export type ScoreParameterName = keyof typeof SCORE_PARAMETERS;

/** The published bounds, kept next to the tables they validate. */
export const MIN_DUEL_SCORE = -140;
export const MAX_DUEL_SCORE = 139;
