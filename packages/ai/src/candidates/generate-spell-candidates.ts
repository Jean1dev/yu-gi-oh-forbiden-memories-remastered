import { spellPlayMode, type DuelAction } from "@yugioh/shared";
import { ZONE_INDICES } from "./constants.ts";
import type { PlayerView } from "./player-view.ts";

export function generateSpellCandidates(view: PlayerView): readonly DuelAction[] {
  if (!view.self.hand.visible) return [];
  const actions: DuelAction[] = [];
  view.self.hand.cards.forEach((card, handIndex) => {
    if (card.tipo === "monstro") return;
    switch (spellPlayMode(card)) {
      case "equip":
        for (const index of ZONE_INDICES) {
          if (view.self.field.monsters[index].occupied) {
            actions.push({
              type: "equip_card",
              handIndex,
              targetZone: { player: view.selfPlayerId, zoneType: "monster", index },
            });
          }
        }
        break;
      case "terrain":
        actions.push({ type: "play_field_spell", handIndex });
        break;
      case "one_shot":
        actions.push({ type: "activate_spell", handIndex });
        break;
      case "place":
        for (const zoneIndex of ZONE_INDICES) {
          if (!view.self.field.spells[zoneIndex].occupied) {
            actions.push({ type: "play_spell_or_trap", handIndex, zoneIndex });
          }
        }
        break;
    }
  });
  return actions;
}
