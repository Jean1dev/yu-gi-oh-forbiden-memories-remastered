import { z } from "zod";

import type {
  AtomicSpellEffect,
  CardClassFilter,
  EffectSide,
  EffectTargets,
  SpellEffect,
} from "./types.ts";

export const EffectSideSchema = z.enum(["caster", "opponent", "both"]);

export const CardClassFilterSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("any") }),
  z.strictObject({ kind: z.literal("classe"), classe: z.string().min(1) }),
]);

export const EffectTargetsSchema = z.strictObject({
  side: EffectSideSchema,
  filter: CardClassFilterSchema,
});

export const AtomicSpellEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("equip_buff"),
    /** Signed, so an equip that trades defence for offence stays representable. */
    atk: z.number().int(),
    def: z.number().int(),
  }),
  z.strictObject({ type: z.literal("destroy_monsters"), targets: EffectTargetsSchema }),
  z.strictObject({ type: z.literal("destroy_spells"), targets: EffectTargetsSchema }),
  z.strictObject({
    type: z.literal("destroy_by_atk"),
    targets: EffectTargetsSchema,
    /** Inclusive: 661 Crush Card reads "1500 or more". */
    minAtk: z.number().int().min(0),
  }),
  z.strictObject({ type: z.literal("force_attack_position"), targets: EffectTargetsSchema }),
  z.strictObject({ type: z.literal("reveal_face_down"), targets: EffectTargetsSchema }),
  z.strictObject({
    type: z.literal("stat_curse"),
    targets: EffectTargetsSchema,
    /** In the original game's own units; one level is `POWER_PER_LEVEL`. */
    levels: z.number().int().min(1),
  }),
  z.strictObject({ type: z.literal("cleanse_curses"), side: EffectSideSchema }),
  z.strictObject({
    type: z.literal("life_points"),
    side: EffectSideSchema,
    /** Signed: negative burns, positive heals. The emitted event carries a positive magnitude. */
    delta: z.number().int(),
  }),
  z.strictObject({
    type: z.literal("attack_lock"),
    side: EffectSideSchema,
    turns: z.number().int().min(1),
  }),
  z.strictObject({ type: z.literal("terrain") }),
]);

export const SpellEffectSchema = z.union([
  AtomicSpellEffectSchema,
  z.strictObject({
    type: z.literal("sequence"),
    /** Two or more: a one-element sequence is just the atomic effect. */
    effects: z.array(AtomicSpellEffectSchema).min(2),
  }),
]);

/**
 * Locks the schemas and the declared types together: if one changes without
 * the other, the typecheck breaks here instead of silently drifting (same
 * pattern as `DuelStateSchema`/`DuelState` in `../schema.ts`).
 */
const _effectMatchesDeclaredType: SpellEffect = {} as z.infer<typeof SpellEffectSchema>;
void _effectMatchesDeclaredType;
const _atomicMatchesDeclaredType: AtomicSpellEffect = {} as z.infer<typeof AtomicSpellEffectSchema>;
void _atomicMatchesDeclaredType;
const _filterMatchesDeclaredType: CardClassFilter = {} as z.infer<typeof CardClassFilterSchema>;
void _filterMatchesDeclaredType;
const _targetsMatchesDeclaredType: EffectTargets = {} as z.infer<typeof EffectTargetsSchema>;
void _targetsMatchesDeclaredType;
const _sideMatchesDeclaredType: EffectSide = {} as z.infer<typeof EffectSideSchema>;
void _sideMatchesDeclaredType;
