import { z } from "zod";

import type { Action } from "./action.ts";
import { MonsterPositionSchema, PlayerIdSchema, ZoneIndexSchema } from "./schema.ts";

export const AdvancePhaseActionSchema = z.strictObject({ type: z.literal("advance_phase") });

/**
 * `handIndex` only has a lower bound here (`>= 0`); the upper bound
 * (`< hand.length`) is dynamic and checked at runtime by `summonMonster`
 * (`card_not_in_hand`), not by zod.
 */
export const SummonMonsterActionSchema = z.strictObject({
  type: z.literal("summon_monster"),
  player: PlayerIdSchema,
  handIndex: z.number().int().min(0),
  zoneIndex: ZoneIndexSchema,
  position: MonsterPositionSchema,
});

export const PlaySpellOrTrapActionSchema = z.strictObject({
  type: z.literal("play_spell_or_trap"),
  handIndex: z.number().int().min(0),
  zoneIndex: ZoneIndexSchema,
});

export const PlayFieldSpellActionSchema = z.strictObject({
  type: z.literal("play_field_spell"),
  handIndex: z.number().int().min(0),
});

export const ActionSchema = z.discriminatedUnion("type", [
  AdvancePhaseActionSchema,
  SummonMonsterActionSchema,
  PlaySpellOrTrapActionSchema,
  PlayFieldSpellActionSchema,
]);

const _schemaMatchesDeclaredType: Action = {} as z.infer<typeof ActionSchema>;
void _schemaMatchesDeclaredType;
