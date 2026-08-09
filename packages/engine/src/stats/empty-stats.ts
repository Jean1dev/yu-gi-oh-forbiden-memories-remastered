import { DUEL_STAT_COUNTERS, type DuelStats, type DuelStatsByPlayer } from "@yugioh/shared";

/**
 * The starting value of every duel counter (rating-engine F01): seven zeros.
 *
 * Built from `DUEL_STAT_COUNTERS` rather than written out, so a counter added
 * to the vocabulary is initialized here without anyone remembering to.
 */
export function emptyDuelStats(): DuelStats {
  return Object.fromEntries(DUEL_STAT_COUNTERS.map((counter) => [counter, 0])) as DuelStats;
}

/** Both players starting at zero — what `initDuel` puts on a fresh `DuelState`. */
export function emptyDuelStatsByPlayer(): DuelStatsByPlayer {
  return { P1: emptyDuelStats(), P2: emptyDuelStats() };
}
