import { z } from "zod";

import type { CardClassFilter, EffectSide, EffectTargets, SpellEffect } from "./types.ts";

export const EffectSideSchema = z.enum(["caster", "opponent", "both"]);

export const CardClassFilterSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("any") }),
  z.strictObject({ kind: z.literal("classe"), classe: z.string().min(1) }),
]);

export const EffectTargetsSchema = z.strictObject({
  side: EffectSideSchema,
  filter: CardClassFilterSchema,
});

export const SpellEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("equip_buff"),
    atk: z.number().int(),
    def: z.number().int(),
    requires: CardClassFilterSchema,
  }),
  z.strictObject({ type: z.literal("destroy_monsters"), targets: EffectTargetsSchema }),
  z.strictObject({ type: z.literal("destroy_spells"), targets: EffectTargetsSchema }),
  z.strictObject({ type: z.literal("force_attack_position"), targets: EffectTargetsSchema }),
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

/**
 * Locks the schemas and the declared types together: if one changes without
 * the other, the typecheck breaks here instead of silently drifting (same
 * pattern as `DuelStateSchema`/`DuelState` in `../schema.ts`).
 */
const _effectMatchesDeclaredType: SpellEffect = {} as z.infer<typeof SpellEffectSchema>;
void _effectMatchesDeclaredType;
const _filterMatchesDeclaredType: CardClassFilter = {} as z.infer<typeof CardClassFilterSchema>;
void _filterMatchesDeclaredType;
const _targetsMatchesDeclaredType: EffectTargets = {} as z.infer<typeof EffectTargetsSchema>;
void _targetsMatchesDeclaredType;
const _sideMatchesDeclaredType: EffectSide = {} as z.infer<typeof EffectSideSchema>;
void _sideMatchesDeclaredType;
