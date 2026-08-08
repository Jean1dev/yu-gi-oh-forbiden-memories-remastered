import {
  BASE_SCORE,
  SCORE_PARAMETERS,
  WIN_TYPE_POINTS,
  type DuelWinType,
  type ScoreParameterName,
  type ScoreParameterTable,
} from "./fm-score-table.ts";

/**
 * The ten measured values of a finished duel, already read off the snapshot.
 *
 * Seven come from `DuelState.stats` (rating-engine F01); `turns`,
 * `remainingCards` and `remainingLifePoints` are read straight from the final
 * state, which already carries them.
 */
export type DuelScoreInput = Readonly<Record<ScoreParameterName, number>> &
  Readonly<{ winType: DuelWinType }>;

/**
 * The contribution of one parameter: the first bucket whose threshold the value
 * falls below, saturating on the last point when it falls below none.
 */
function pointsFor(table: ScoreParameterTable, value: number): number {
  const index = table.thresholds.findIndex((threshold) => value < threshold);
  return index === -1 ? table.points[table.points.length - 1]! : table.points[index]!;
}

/**
 * The Forbidden Memories duel score (rating-engine F02): a base of 50, adjusted
 * by ten parameters and by how the duel was won.
 *
 * Pure and total — no PRNG, no clock, no I/O, and no input can make it throw.
 * The result always lands in `[MIN_DUEL_SCORE, MAX_DUEL_SCORE]`, which is the
 * property that guards the transcribed tables against accidental edits.
 */
export function scoreDuel(input: DuelScoreInput): number {
  const parameterPoints = (
    Object.keys(SCORE_PARAMETERS) as readonly ScoreParameterName[]
  ).reduce((sum, name) => sum + pointsFor(SCORE_PARAMETERS[name], input[name]), 0);

  return BASE_SCORE + parameterPoints + WIN_TYPE_POINTS[input.winType];
}
