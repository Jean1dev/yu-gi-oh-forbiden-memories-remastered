import { z } from "zod";

import { CardSchema } from "../card/schema.ts";
import { EVENT_TYPES } from "./constants.ts";
import type { DuelEvent, EventType, JsonValue, ReactionWindow, ZoneReference } from "./events.ts";
import type { DuelState, MonsterZone, PlayerField, PlayerState, SpellZone } from "./types.ts";

export const PlayerIdSchema = z.enum(["P1", "P2"]);

export const PhaseSchema = z.enum(["draw", "main", "battle", "end"]);

export const MonsterPositionSchema = z.enum([
  "attack_face_up",
  "attack_face_down",
  "defense_face_up",
  "defense_face_down",
]);

export const MonsterZoneSchema = z.discriminatedUnion("occupied", [
  z.strictObject({ occupied: z.literal(false) }),
  z.strictObject({
    occupied: z.literal(true),
    card: CardSchema,
    position: MonsterPositionSchema,
    hasAttacked: z.boolean(),
    hasChangedPosition: z.boolean(),
  }),
]);

export const SpellZoneSchema = z.discriminatedUnion("occupied", [
  z.strictObject({ occupied: z.literal(false) }),
  z.strictObject({
    occupied: z.literal(true),
    card: CardSchema,
    faceUp: z.boolean(),
  }),
]);

export const PlayerFieldSchema = z.strictObject({
  monsters: z.tuple([
    MonsterZoneSchema,
    MonsterZoneSchema,
    MonsterZoneSchema,
    MonsterZoneSchema,
    MonsterZoneSchema,
  ]),
  spells: z.tuple([
    SpellZoneSchema,
    SpellZoneSchema,
    SpellZoneSchema,
    SpellZoneSchema,
    SpellZoneSchema,
  ]),
});

export const PlayerStateSchema = z.strictObject({
  lp: z.number().int().min(0),
  hand: z.array(CardSchema),
  deck: z.array(CardSchema),
  field: PlayerFieldSchema,
});

export const EventTypeSchema = z.enum(EVENT_TYPES);

export const ZoneTypeSchema = z.enum(["monster", "spell"]);

export const ZoneIndexSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const ZoneReferenceSchema = z.strictObject({
  player: PlayerIdSchema,
  zoneType: ZoneTypeSchema,
  index: ZoneIndexSchema,
});

/**
 * Recursive schema: any value serializable as JSON. `z.lazy` defers evaluation
 * of the self-reference until the schema is used, which is what makes the
 * recursion possible; the explicit `z.ZodType<JsonValue>` annotation is
 * required because TypeScript cannot infer a recursive type on its own.
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const DuelEventSchema = z.strictObject({
  type: EventTypeSchema,
  originPlayer: PlayerIdSchema,
  involvedCards: z.array(CardSchema),
  involvedZones: z.array(ZoneReferenceSchema),
  context: z.record(z.string(), JsonValueSchema),
});

export const ReactionWindowSchema = z.strictObject({
  type: z.literal("reaction_window"),
  event: DuelEventSchema,
  reactingPlayer: PlayerIdSchema,
});

export const DuelStateSchema = z.strictObject({
  players: z.strictObject({
    P1: PlayerStateSchema,
    P2: PlayerStateSchema,
  }),
  activeField: CardSchema.nullable(),
  activePlayer: PlayerIdSchema,
  turn: z.number().int().min(1),
  phase: PhaseSchema,
  pending: ReactionWindowSchema.optional(),
});

/**
 * Locks the schema and the declared type together: if one changes without
 * the other, the typecheck breaks here instead of silently drifting (same
 * pattern as `CardSchema`/`Card` in `packages/shared/src/card`).
 */
const _schemaMatchesDeclaredType: DuelState = {} as z.infer<typeof DuelStateSchema>;
void _schemaMatchesDeclaredType;
const _fieldMatchesDeclaredType: PlayerField = {} as z.infer<typeof PlayerFieldSchema>;
void _fieldMatchesDeclaredType;
const _playerMatchesDeclaredType: PlayerState = {} as z.infer<typeof PlayerStateSchema>;
void _playerMatchesDeclaredType;
const _monsterZoneMatchesDeclaredType: MonsterZone = {} as z.infer<typeof MonsterZoneSchema>;
void _monsterZoneMatchesDeclaredType;
const _spellZoneMatchesDeclaredType: SpellZone = {} as z.infer<typeof SpellZoneSchema>;
void _spellZoneMatchesDeclaredType;
const _eventTypeMatchesDeclaredType: EventType = {} as z.infer<typeof EventTypeSchema>;
void _eventTypeMatchesDeclaredType;
const _zoneReferenceMatchesDeclaredType: ZoneReference = {} as z.infer<typeof ZoneReferenceSchema>;
void _zoneReferenceMatchesDeclaredType;
const _eventMatchesDeclaredType: DuelEvent = {} as z.infer<typeof DuelEventSchema>;
void _eventMatchesDeclaredType;
const _reactionWindowMatchesDeclaredType: ReactionWindow = {} as z.infer<
  typeof ReactionWindowSchema
>;
void _reactionWindowMatchesDeclaredType;
