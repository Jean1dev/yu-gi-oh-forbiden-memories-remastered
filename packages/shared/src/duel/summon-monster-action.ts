import type { ZoneIndex } from "./events.ts";
import type { MonsterPosition, PlayerId } from "./types.ts";

/**
 * Summons a monster from `player`'s hand into a free monster zone, in one of
 * the four positions, with no tribute (motor-duelo-1x1 F08). The card is
 * identified by `handIndex` — its position in `hand` at the moment the action
 * is applied — rather than by card number, since up to 3 copies of the same
 * card can coexist in a hand.
 */
export type SummonMonsterAction = Readonly<{
  type: "summon_monster";
  player: PlayerId;
  handIndex: number;
  zoneIndex: ZoneIndex;
  position: MonsterPosition;
}>;
