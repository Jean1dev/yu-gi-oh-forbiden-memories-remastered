import type { EquipmentModifierProvider } from "@yugioh/shared";

/**
 * Neutral rules-layer implementation of {@link EquipmentModifierProvider}.
 * Actual attached equipment is zone context, but this port receives only a
 * `Card`; the engine therefore closes over `MonsterZone.equips` when building
 * its combat provider. This rules-layer fallback intentionally stays neutral.
 */
export const neutralEquipmentModifier: EquipmentModifierProvider = () => ({ atk: 0, def: 0 });
