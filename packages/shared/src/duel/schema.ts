import { z } from "zod";

import { CardSchema } from "../card/schema.ts";
import { EVENT_TYPES } from "./constants.ts";
import type { DuelEvent, EventType, JsonValue, ReactionWindow, ZoneReference } from "./events.ts";
import type {
  DuelState,
  MonsterZone,
  PlayerField,
  PlayerState,
  PublicCard,
  PublicDuelEvent,
  PublicDuelState,
  PublicHand,
  PublicMonsterZone,
  PublicPlayerField,
  PublicPlayerState,
  PublicReactionWindow,
  PublicSpellZone,
  SpellZone,
} from "./types.ts";

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
  seed: z.number().int().min(0).max(0xffffffff),
});

export const PublicCardSchema = z.discriminatedUnion("visible", [
  z.strictObject({ visible: z.literal(true), card: CardSchema }),
  z.strictObject({ visible: z.literal(false) }),
]);

export const PublicHandSchema = z.discriminatedUnion("visible", [
  z.strictObject({ visible: z.literal(true), cards: z.array(CardSchema) }),
  z.strictObject({ visible: z.literal(false), count: z.number().int().nonnegative() }),
]);

export const PublicMonsterZoneSchema = z.discriminatedUnion("occupied", [
  z.strictObject({ occupied: z.literal(false) }),
  z.strictObject({
    occupied: z.literal(true),
    card: PublicCardSchema,
    position: MonsterPositionSchema,
    hasAttacked: z.boolean(),
    hasChangedPosition: z.boolean(),
  }),
]);

export const PublicSpellZoneSchema = z.discriminatedUnion("occupied", [
  z.strictObject({ occupied: z.literal(false) }),
  z.strictObject({
    occupied: z.literal(true),
    card: PublicCardSchema,
    faceUp: z.boolean(),
  }),
]);

export const PublicPlayerFieldSchema = z.strictObject({
  monsters: z.tuple([
    PublicMonsterZoneSchema,
    PublicMonsterZoneSchema,
    PublicMonsterZoneSchema,
    PublicMonsterZoneSchema,
    PublicMonsterZoneSchema,
  ]),
  spells: z.tuple([
    PublicSpellZoneSchema,
    PublicSpellZoneSchema,
    PublicSpellZoneSchema,
    PublicSpellZoneSchema,
    PublicSpellZoneSchema,
  ]),
});

export const PublicPlayerStateSchema = z.strictObject({
  lp: z.number().int().min(0),
  hand: PublicHandSchema,
  remainingDeck: z.number().int().nonnegative(),
  field: PublicPlayerFieldSchema,
});

export const PublicDuelEventSchema = z.strictObject({
  type: EventTypeSchema,
  originPlayer: PlayerIdSchema,
  involvedCards: z.array(PublicCardSchema),
  involvedZones: z.array(ZoneReferenceSchema),
  context: z.record(z.string(), JsonValueSchema),
});

export const PublicReactionWindowSchema = z.strictObject({
  type: z.literal("reaction_window"),
  event: PublicDuelEventSchema,
  reactingPlayer: PlayerIdSchema,
});

export const PublicDuelStateSchema = z.strictObject({
  players: z.strictObject({
    P1: PublicPlayerStateSchema,
    P2: PublicPlayerStateSchema,
  }),
  activeField: CardSchema.nullable(),
  activePlayer: PlayerIdSchema,
  turn: z.number().int().min(1),
  phase: PhaseSchema,
  pending: PublicReactionWindowSchema.optional(),
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
const _publicCardMatchesDeclaredType: PublicCard = {} as z.infer<typeof PublicCardSchema>;
void _publicCardMatchesDeclaredType;
const _publicHandMatchesDeclaredType: PublicHand = {} as z.infer<typeof PublicHandSchema>;
void _publicHandMatchesDeclaredType;
const _publicMonsterZoneMatchesDeclaredType: PublicMonsterZone = {} as z.infer<
  typeof PublicMonsterZoneSchema
>;
void _publicMonsterZoneMatchesDeclaredType;
const _publicSpellZoneMatchesDeclaredType: PublicSpellZone = {} as z.infer<
  typeof PublicSpellZoneSchema
>;
void _publicSpellZoneMatchesDeclaredType;
const _publicFieldMatchesDeclaredType: PublicPlayerField = {} as z.infer<
  typeof PublicPlayerFieldSchema
>;
void _publicFieldMatchesDeclaredType;
const _publicPlayerMatchesDeclaredType: PublicPlayerState = {} as z.infer<
  typeof PublicPlayerStateSchema
>;
void _publicPlayerMatchesDeclaredType;
const _publicEventMatchesDeclaredType: PublicDuelEvent = {} as z.infer<
  typeof PublicDuelEventSchema
>;
void _publicEventMatchesDeclaredType;
const _publicReactionMatchesDeclaredType: PublicReactionWindow = {} as z.infer<
  typeof PublicReactionWindowSchema
>;
void _publicReactionMatchesDeclaredType;
const _publicStateMatchesDeclaredType: PublicDuelState = {} as z.infer<
  typeof PublicDuelStateSchema
>;
void _publicStateMatchesDeclaredType;
