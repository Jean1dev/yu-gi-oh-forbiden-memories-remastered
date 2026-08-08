import { DUEL_GRADES, type DuelGrade } from "@yugioh/shared";

/**
 * Where the ladder starts: the first grade covers everything below this, and
 * each following grade covers the next `GRADE_BAND` points.
 */
const FIRST_BAND_CEILING = 10;
const GRADE_BAND = 10;

/**
 * The Forbidden Memories duel grade for a score (rating-engine F02).
 *
 * Ten bands of ten points, saturating at both ends: `≤ 9` is `S-TEC`, `50–59`
 * is `D-POW`, `≥ 90` is `S-POW`. The axis is single — a low score is technical
 * and a high score is power — so `DUEL_GRADES` is already in score order and
 * this is an index into it.
 *
 * Total for any integer, including scores outside the theoretical
 * `[-140, 139]` range, so a future change to the tables cannot make it throw.
 */
export function gradeFromScore(score: number): DuelGrade {
  const band = Math.floor((score - FIRST_BAND_CEILING) / GRADE_BAND) + 1;
  const index = Math.min(Math.max(band, 0), DUEL_GRADES.length - 1);
  return DUEL_GRADES[index]!;
}
