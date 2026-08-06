import type { PublicMonsterZone } from "@yugioh/shared";

export function visibleCombatValue(zone: PublicMonsterZone): number | undefined {
  if (!zone.occupied || !zone.card.visible) return undefined;
  return zone.position.startsWith("attack") ? (zone.card.card.atk ?? 0) : (zone.card.card.def ?? 0);
}
