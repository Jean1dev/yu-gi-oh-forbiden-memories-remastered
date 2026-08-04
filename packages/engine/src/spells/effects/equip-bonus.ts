import {
  getSpellEffect,
  matchesClassFilter,
  type Card,
  type EffectiveAtkDef,
  type MonsterZone,
} from "@yugioh/shared";

import type { ModifierProviders } from "../../combat/calculate-effective-atk-def.ts";
import { neutralCombatProviders } from "../../combat/neutral-combat-providers.ts";

type OccupiedMonsterZone = Extract<MonsterZone, { occupied: true }>;

/**
 * The accumulated equip delta for one monster: every attached card whose table
 * entry is an `equip_buff` and whose class restriction the host satisfies
 * (`docs/spells/equip-buffs.md` §3).
 *
 * A restricted equip on an ineligible host contributes 0 — that is a legal
 * play, not an error, and the card is not removed. Bonuses stack additively
 * with no cap, matching `calculateEffectiveAtkDef`, which does not clamp.
 *
 * Derived, never stored: the delta is recomputed from `SPELL_EFFECTS` on every
 * call, so the card's base `atk`/`def` are never overwritten
 * (`docs/arquitetura.md` §3.1).
 */
export function sumEquipBonuses(host: Card, equips: readonly Card[]): EffectiveAtkDef {
  return equips.reduce<EffectiveAtkDef>(
    (total, equip) => {
      const effect = getSpellEffect(equip.numero);
      if (effect?.type !== "equip_buff") return total;
      if (!matchesClassFilter(host, effect.requires)) return total;
      return { atk: total.atk + effect.atk, def: total.def + effect.def };
    },
    { atk: 0, def: 0 },
  );
}

/**
 * A real {@link ModifierProviders} bundle for one occupied zone: the equipment
 * slot closes over that zone's `equips` at construction time, which is exactly
 * the extension point `neutralCombatProviders` describes — `apply` stays a
 * two-parameter function and the engine still imports nothing but
 * `@yugioh/shared`.
 *
 * Guardian and terrain stay neutral: their tables in `packages/data` are still
 * empty (`docs/arquitetura.md` §4.3).
 */
export function equipCombatProviders(zone: OccupiedMonsterZone): ModifierProviders {
  return {
    ...neutralCombatProviders,
    equipment: (monster) => sumEquipBonuses(monster, zone.equips),
  };
}
