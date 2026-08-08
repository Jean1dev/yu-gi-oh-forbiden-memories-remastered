export { evaluateDuel } from "./evaluate-duel.ts";
export {
  BASE_SCORE,
  MAX_DUEL_SCORE,
  MIN_DUEL_SCORE,
  SCORE_PARAMETERS,
  WIN_TYPE_POINTS,
  type DuelWinType,
  type ScoreParameterName,
  type ScoreParameterTable,
} from "./fm-score-table.ts";
export { gradeFromScore } from "./grade-duel.ts";
export { GRADE_REWARDS, rewardForGrade } from "./rating-reward-table.ts";
export { scoreDuel, type DuelScoreInput } from "./score-duel.ts";
