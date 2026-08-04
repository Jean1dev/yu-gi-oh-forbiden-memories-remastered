import type { Card } from "../../card/types.ts";
import { getSpellEffect } from "./table.ts";
import type { SpellPlayMode } from "./types.ts";

/**
 * Which action a card in hand must be played with (`docs/spells/README.md` §4).
 *
 * Derived from the effect table, never from `tipo` alone — cards 302 and 306
 * are `tipo: "equipamento"` but resolve immediately. Lives in `shared` because
 * `apps/web`'s intent state machine needs it to route a hand selection, and it
 * may not import `packages/engine`.
 */
export function spellPlayMode(card: Card): SpellPlayMode {
  const effect = getSpellEffect(card.numero);
  if (effect === undefined) {
    return "place";
  }

  switch (effect.type) {
    case "equip_buff":
      return "equip";
    case "terrain":
      return "terrain";
    default:
      return "one_shot";
  }
}
