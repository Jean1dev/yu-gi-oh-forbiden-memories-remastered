import {
  getSpellEffect,
  requiresSpellTarget,
  spellPlayMode,
  type Card,
  type DuelAction,
  type PlayerId,
  type ZoneReference,
} from "@yugioh/shared";
import { ZONE_INDICES } from "./constants.ts";
import type { PlayerView } from "./player-view.ts";

/**
 * Every zone a targeted spell could legally be aimed at, mirroring the guards
 * in `activateSpell`. An empty result means the card is unplayable right now,
 * so no `activate_spell` candidate is offered at all.
 */
function spellTargets(view: PlayerView, card: Card): readonly ZoneReference[] {
  const effect = getSpellEffect(card.numero);
  if (effect?.type !== "force_attack_position") return [];

  const sides: readonly PlayerId[] =
    effect.targets.side === "both"
      ? [view.selfPlayerId, view.opponentPlayerId]
      : effect.targets.side === "opponent"
        ? [view.opponentPlayerId]
        : [view.selfPlayerId];

  const targets: ZoneReference[] = [];
  for (const player of sides) {
    const field = player === view.selfPlayerId ? view.self.field : view.opponent.field;
    for (const index of ZONE_INDICES) {
      const zone = field.monsters[index];
      if (!zone.occupied) continue;
      if (zone.position !== "defense_face_up" && zone.position !== "defense_face_down") continue;
      targets.push({ player, zoneType: "monster", index });
    }
  }
  return targets;
}

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
      case "one_shot": {
        const effect = getSpellEffect(card.numero);
        if (effect !== undefined && requiresSpellTarget(effect)) {
          // One candidate per legal zone, the same way `equip` enumerates its
          // hosts — the policy then picks among them.
          for (const targetZone of spellTargets(view, card)) {
            actions.push({ type: "activate_spell", handIndex, targetZone });
          }
        } else {
          actions.push({ type: "activate_spell", handIndex });
        }
        break;
      }
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
