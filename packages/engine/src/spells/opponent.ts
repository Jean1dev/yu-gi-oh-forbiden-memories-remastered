import type { PlayerId } from "@yugioh/shared";

/** The other side of the duel from `player`. */
export function getOpponent(player: PlayerId): PlayerId {
  return player === "P1" ? "P2" : "P1";
}
