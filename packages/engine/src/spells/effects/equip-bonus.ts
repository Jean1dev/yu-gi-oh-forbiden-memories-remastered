import {
  getSpellEffect,
  isEquipCompatible,
  POWER_PER_LEVEL,
  type Card,
  type EffectiveAtkDef,
  type EquipAttachment,
  type MonsterZone,
} from "@yugioh/shared";

import type { ModifierProviders } from "../../combat/calculate-effective-atk-def.ts";
import { neutralCombatProviders } from "../../combat/neutral-combat-providers.ts";

type OccupiedMonsterZone = Extract<MonsterZone, { occupied: true }>;

/**
 * The accumulated equip delta for one monster: every attached card whose table
 * entry is an `equip_buff` and whose host the original game accepts
 * (`docs/spells/equip-buffs.md` §3).
 *
 * Compatibility is a per-card list, not a class filter: the original curates
 * which monsters each equip may be attached to, and Harpie Lady is a
 * `Winged Beast` that legally takes Book of Secret Arts. An incompatible host
 * contributes 0 — a legal play, not an error, and the card is not removed.
 * Bonuses stack additively with no cap, matching `calculateEffectiveAtkDef`,
 * which does not clamp.
 *
 * Derived, never stored: the delta is recomputed from `SPELL_EFFECTS` on every
 * call, so the card's base `atk`/`def` are never overwritten
 * (`docs/arquitetura.md` §3.1).
 */
export function sumEquipBonuses(
  host: Card,
  equips: readonly (EquipAttachment | Card)[],
): EffectiveAtkDef {
  return equips.reduce<EffectiveAtkDef>(
    (total, candidate) => {
      const attachment: EquipAttachment =
        "card" in candidate ? candidate : { card: candidate, polarity: "normal" };
      const effect = getSpellEffect(attachment.card.numero);
      if (effect?.type !== "equip_buff") return total;
      if (!isEquipCompatible(attachment.card.numero, host.numero)) return total;
      const polarity = attachment.polarity === "reversed" ? -1 : 1;
      return {
        atk: total.atk + effect.atk * polarity,
        def: total.def + effect.def * polarity,
      };
    },
    { atk: 0, def: 0 },
  );
}

/**
 * The penalty a curse imposes, as a negative delta (349 Spellbinding Circle,
 * 669 Shadow Spell). Stored in levels and converted here, so 655 Cursebreaker
 * only has to zero a counter (`docs/spells/stat-curse.md` §3).
 *
 * Not floored: a monster cursed below zero keeps a negative effective ATK,
 * exactly as `calculateEffectiveAtkDef` already allows, and the combat table
 * compares the numbers as they are.
 */
export function cursePenalty(curseLevels: number | undefined): EffectiveAtkDef {
  const levels = curseLevels ?? 0;
  // Guarded rather than multiplied straight through: `-500 * 0` is `-0`, which
  // survives `toEqual` and JSON round-trips as `0` — a difference that would
  // only ever show up as a confusing test failure.
  const penalty = levels === 0 ? 0 : -POWER_PER_LEVEL * levels;
  return { atk: penalty, def: penalty };
}

/**
 * A real {@link ModifierProviders} bundle for one occupied zone: the equipment
 * slot closes over that zone's `equips` **and** its curse at construction
 * time, which is exactly the extension point `neutralCombatProviders`
 * describes — `apply` stays a two-parameter function and the engine still
 * imports nothing but `@yugioh/shared`.
 *
 * The curse rides in the `equipment` slot rather than in a fourth provider:
 * that slot already means "the delta derived from this zone", so
 * `calculateEffectiveAtkDef` and `ModifierProviders` need no change at all.
 *
 * Guardian and terrain stay neutral: their tables in `packages/data` are still
 * empty (`docs/arquitetura.md` §4.3).
 */
export function zoneCombatProviders(zone: OccupiedMonsterZone): ModifierProviders {
  const curse = cursePenalty(zone.curseLevels);
  return {
    ...neutralCombatProviders,
    equipment: (monster) => {
      const equips = sumEquipBonuses(monster, zone.equips);
      return { atk: equips.atk + curse.atk, def: equips.def + curse.def };
    },
  };
}
