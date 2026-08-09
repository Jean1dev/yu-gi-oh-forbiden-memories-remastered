import { describe, expect, it } from "vitest";

import {
  BASE_SCORE,
  MAX_DUEL_SCORE,
  MIN_DUEL_SCORE,
  SCORE_PARAMETERS,
  WIN_TYPE_POINTS,
  type ScoreParameterName,
} from "./fm-score-table.ts";

const parameterNames = Object.keys(SCORE_PARAMETERS) as readonly ScoreParameterName[];

function sumOfExtremes(pick: (points: readonly number[]) => number): number {
  return parameterNames.reduce((sum, name) => sum + pick(SCORE_PARAMETERS[name].points), 0);
}

/**
 * These two are the transcription check, not a behaviour check: the original's
 * published bounds are -140 and +139, and they can only come out of these
 * tables if every threshold and point value was copied correctly. A single
 * mistyped digit breaks one of them.
 */
describe("FM score tables — transcription check", () => {
  it("the minimum achievable score is exactly -140", () => {
    const worstParameters = sumOfExtremes((points) => Math.min(...points));
    const worstWinType = Math.min(...Object.values(WIN_TYPE_POINTS));

    expect(BASE_SCORE + worstParameters + worstWinType).toBe(MIN_DUEL_SCORE);
    expect(MIN_DUEL_SCORE).toBe(-140);
  });

  it("the maximum achievable score is exactly +139", () => {
    const bestParameters = sumOfExtremes((points) => Math.max(...points));
    const bestWinType = Math.max(...Object.values(WIN_TYPE_POINTS));

    expect(BASE_SCORE + bestParameters + bestWinType).toBe(MAX_DUEL_SCORE);
    expect(MAX_DUEL_SCORE).toBe(139);
  });

  it("starts every duel at 50", () => {
    expect(BASE_SCORE).toBe(50);
  });
});

describe("FM score tables — shape", () => {
  it("covers exactly ten parameters", () => {
    expect(parameterNames).toHaveLength(10);
  });

  it.each(parameterNames)("%s has four thresholds and five point values", (name) => {
    expect(SCORE_PARAMETERS[name].thresholds).toHaveLength(4);
    expect(SCORE_PARAMETERS[name].points).toHaveLength(5);
  });

  it.each(parameterNames)("%s has strictly increasing thresholds", (name) => {
    const { thresholds } = SCORE_PARAMETERS[name];

    for (let index = 1; index < thresholds.length; index += 1) {
      expect(thresholds[index]!).toBeGreaterThan(thresholds[index - 1]!);
    }
  });

  it("scores annihilation above a deck-out win", () => {
    expect(WIN_TYPE_POINTS.annihilation).toBe(2);
    expect(WIN_TYPE_POINTS.deck_out).toBe(-40);
    expect(WIN_TYPE_POINTS.exodia).toBe(40);
  });
});
