import type { DuelAction } from "@yugioh/shared";
import { ZONE_INDICES } from "./constants.ts";
import type { PlayerView } from "./player-view.ts";

export function generateAttackCandidates(view: PlayerView): readonly DuelAction[] {
  const targets = ZONE_INDICES.filter((index) => view.opponent.field.monsters[index].occupied);
  const actions: DuelAction[] = [];
  for (const attackerZoneIndex of ZONE_INDICES) {
    const attacker = view.self.field.monsters[attackerZoneIndex];
    if (!attacker.occupied || attacker.hasAttacked) continue;
    if (targets.length === 0) {
      actions.push({ type: "declare_attack", attackerZoneIndex });
    } else {
      for (const targetZoneIndex of targets) {
        actions.push({ type: "declare_attack", attackerZoneIndex, targetZoneIndex });
      }
    }
  }
  return actions;
}
