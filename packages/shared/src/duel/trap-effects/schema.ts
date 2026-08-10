import { z } from "zod";

import type { TrapEffect } from "./types.ts";

export const TrapEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("destroy_attacker"),
    maxAtk: z.number().int().nonnegative().nullable(),
  }),
  z.strictObject({ type: z.literal("reflect_effect_damage") }),
  z.strictObject({ type: z.literal("invert_effect_heal") }),
  z.strictObject({ type: z.literal("reverse_equip") }),
  z.strictObject({ type: z.literal("decoy") }),
]);

const _schemaMatchesDeclaredType: TrapEffect = {} as z.infer<typeof TrapEffectSchema>;
void _schemaMatchesDeclaredType;
