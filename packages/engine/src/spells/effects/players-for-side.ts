import type { EffectSide, PlayerId } from "@yugioh/shared";

import { getOpponent } from "../opponent.ts";

const BOTH_PLAYERS: readonly PlayerId[] = ["P1", "P2"];

/**
 * Which players an effect reaches, **always in `P1, P2` order** regardless of
 * who cast the card (`docs/spells/README.md` §5).
 *
 * Fixing the order independently of the caster is what keeps a field sweep
 * deterministic: the sequence of `onDestroy` events for a given board is the
 * same whether P1 or P2 played the card.
 */
export function playersForSide(side: EffectSide, caster: PlayerId): readonly PlayerId[] {
  switch (side) {
    case "caster":
      return [caster];
    case "opponent":
      return [getOpponent(caster)];
    case "both":
      return BOTH_PLAYERS;
  }
}
