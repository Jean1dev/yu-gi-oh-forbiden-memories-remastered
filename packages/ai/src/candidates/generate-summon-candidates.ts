import type { DuelAction } from "@yugioh/shared";
import { MONSTER_POSITIONS, ZONE_INDICES } from "./constants.ts";
import type { PlayerView } from "./player-view.ts";

export function generateSummonCandidates(view: PlayerView): readonly DuelAction[] {
  if (!view.self.hand.visible) return [];
  const actions: DuelAction[] = [];
  view.self.hand.cards.forEach((card, handIndex) => {
    if (card.tipo !== "monstro") return;
    for (const zoneIndex of ZONE_INDICES) {
      if (view.self.field.monsters[zoneIndex].occupied) continue;
      for (const position of MONSTER_POSITIONS) {
        actions.push({
          type: "summon_monster",
          player: view.selfPlayerId,
          handIndex,
          zoneIndex,
          position,
        });
      }
    }
  });
  return actions;
}
