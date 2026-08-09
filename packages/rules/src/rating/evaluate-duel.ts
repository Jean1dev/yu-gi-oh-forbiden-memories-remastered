import {
  DomainError,
  err,
  ok,
  type DecisiveDuelEndReason,
  type PlayerId,
  type RatingEvaluation,
  type Result,
  type Snapshot,
} from "@yugioh/shared";

import { gradeFromScore } from "./grade-duel.ts";
import { rewardForGrade } from "./rating-reward-table.ts";
import { scoreDuel, type DuelScoreInput } from "./score-duel.ts";
import type { DuelWinType } from "./fm-score-table.ts";

/**
 * How the duel ended, in scoring terms.
 *
 * `surrender` has no mapping on purpose: the original defines points for
 * annihilation, deck-out and Exodia only. Nobody wins by conceding, and the
 * engine has no action for conceding on the opponent's behalf — so this is an
 * explicit gap rather than a silent zero, which would be an invented value.
 */
function winTypeFor(reason: DecisiveDuelEndReason): DuelWinType | undefined {
  switch (reason) {
    case "lp_depleted":
      return "annihilation";
    case "deck_out":
      return "deck_out";
    case "surrender":
      return undefined;
  }
}

/**
 * Grades a finished duel for one player (rating-engine F02 + F03).
 *
 * Pure and total: every failure travels back as a `DomainError`, nothing is
 * thrown, and the same snapshot always produces the same evaluation. That
 * determinism is what gives `free-duel/F06` a stable `dropTier` to feed its own
 * deterministic draw.
 *
 * Only the winner is graded — defeat and draw earn no reward by decision of
 * `free-duel/F05`, and that rule is enforced here rather than trusted to the
 * caller.
 */
export function evaluateDuel(
  snapshot: Snapshot,
  player: PlayerId,
): Result<RatingEvaluation, DomainError> {
  const outcome = snapshot.outcome;
  if (outcome === undefined) {
    return err(new DomainError("The duel has not ended yet.", "duel_outcome_missing"));
  }

  if (outcome.status !== "decisive" || outcome.winner !== player) {
    return err(
      new DomainError("Only the winner of a decisive duel is graded.", "duel_not_won_by_player", {
        status: outcome.status,
        winner: outcome.winner,
        player,
      }),
    );
  }

  const winType = winTypeFor(outcome.reason);
  if (winType === undefined) {
    return err(
      new DomainError(
        "This duel end reason has no score in the original game.",
        "unscorable_duel_end_reason",
        { reason: outcome.reason },
      ),
    );
  }

  // Never fall back to zeroed counters: a snapshot taken before rating-engine
  // F01 would score as a near-perfect duel nobody measured.
  const stats = snapshot.stats[player] as (typeof snapshot.stats)[PlayerId] | undefined;
  if (stats === undefined) {
    return err(
      new DomainError("The snapshot carries no duel statistics.", "duel_stats_missing", { player }),
    );
  }

  const input: DuelScoreInput = {
    turns: snapshot.turn,
    effectiveAttacks: stats.effectiveAttacks,
    defensiveVictories: stats.defensiveVictories,
    faceDownPlays: stats.faceDownPlays,
    fusions: stats.fusions,
    equips: stats.equips,
    pureMagics: stats.pureMagics,
    triggeredTraps: stats.triggeredTraps,
    remainingCards: snapshot.players[player].deck.length,
    remainingLifePoints: snapshot.players[player].lp,
    winType,
  };

  const grade = gradeFromScore(scoreDuel(input));
  return ok({ grade, reward: rewardForGrade(grade) });
}
