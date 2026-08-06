import type { DUEL_STAT_COUNTERS } from "./constants.ts";
import type { PlayerId } from "./player.ts";

/**
 * One of the seven per-player duel counters (`DUEL_STAT_COUNTERS`). Names stay
 * in English like the rest of the domain, even though the rating tables they
 * feed are documented in Portuguese in `docs/prds/rating-engine.md`.
 */
export type DuelStatCounter = (typeof DUEL_STAT_COUNTERS)[number];

/**
 * How one player played the duel, in the seven terms the Forbidden Memories
 * rating formula counts (rating-engine F01). Every counter is a non-negative
 * integer, starts at 0 and only ever grows.
 *
 * - `effectiveAttacks` — this player's monster destroyed an opposing monster
 *   that was in **attack** posture.
 * - `defensiveVictories` — this player's monster in **defense** posture
 *   survived an incoming attack. Credited to the *defender's* owner, which is
 *   the one attribution in the accumulator that is not "whoever acted".
 * - `faceDownPlays` — cards this player put down face-down: monsters summoned
 *   in a face-down position, plus traps. Magic and equip cards enter face-up,
 *   so they do not count here.
 * - `fusions` — fusions this player completed. A fusion consumes the turn's
 *   single hand play, so it increments this counter and no other, whatever the
 *   result card is placed as.
 * - `equips` — equip magic cards played.
 * - `pureMagics` — effect magic and field magic activated.
 * - `triggeredTraps` — traps triggered. Permanently 0: the engine has no trap
 *   activation yet. That is the true count of a duel in which no trap fired,
 *   not a placeholder — the formula already scores that case (spec Decision 6).
 */
export type DuelStats = Readonly<Record<DuelStatCounter, number>>;

/**
 * Both players' counters, indexed exactly like `DuelState.players` so the two
 * are read the same way.
 */
export type DuelStatsByPlayer = Readonly<Record<PlayerId, DuelStats>>;
