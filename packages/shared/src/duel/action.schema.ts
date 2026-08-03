import { z } from "zod";

import type { Action } from "./action.ts";
import {
  MonsterPositionSchema,
  PlayerIdSchema,
  ZoneIndexSchema,
  ZoneReferenceSchema,
} from "./schema.ts";

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

export const EquipCardActionSchema = z.strictObject({
  type: z.literal("equip_card"),
  handIndex: z.number().int().min(0),
  targetZone: ZoneReferenceSchema,
});

export const PlayFieldSpellActionSchema = z.strictObject({
  type: z.literal("play_field_spell"),
  handIndex: z.number().int().min(0),
});

export const ChangePositionActionSchema = z.strictObject({
  type: z.literal("change_position"),
  zone: ZoneReferenceSchema,
});

export const DeclareAttackActionSchema = z.strictObject({
  type: z.literal("declare_attack"),
  attackerZoneIndex: ZoneIndexSchema,
  targetZoneIndex: ZoneIndexSchema.optional(),
});

export const ResolveAttackActionSchema = z.strictObject({ type: z.literal("resolve_attack") });

/**
 * `player` is what enforces the PRD's "Rendição inválida" case: a non-player
 * can only ever arrive through an untyped boundary (an Online Duel payload),
 * and `PlayerIdSchema` rejects it there. The engine itself takes the field as
 * already valid and never re-checks it.
 */
export const SurrenderActionSchema = z.strictObject({
  type: z.literal("surrender"),
  player: PlayerIdSchema,
});

export const ActionSchema = z.discriminatedUnion("type", [
  AdvancePhaseActionSchema,
  SummonMonsterActionSchema,
  PlaySpellOrTrapActionSchema,
  EquipCardActionSchema,
  PlayFieldSpellActionSchema,
  ChangePositionActionSchema,
  DeclareAttackActionSchema,
  ResolveAttackActionSchema,
  SurrenderActionSchema,
]);

const _schemaMatchesDeclaredType: Action = {} as z.infer<typeof ActionSchema>;
void _schemaMatchesDeclaredType;
