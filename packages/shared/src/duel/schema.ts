import { z } from "zod";

import { CardSchema } from "../card/schema.ts";
import { DUEL_STAT_COUNTERS, EVENT_TYPES } from "./constants.ts";
import type { DuelEvent, EventType, JsonValue, ReactionWindow, ZoneReference } from "./events.ts";
import type { DuelStats, DuelStatsByPlayer } from "./stats.ts";
import type {
  AttackLock,
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
    equips: z.array(CardSchema),
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
  handPlayUsed: z.boolean(),
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

const FusionStepSchema = z.strictObject({
  material: z.string().regex(/^\d{3}$/u),
  accumulator: z.string().regex(/^\d{3}$/u),
  result: z
    .string()
    .regex(/^\d{3}$/u)
    .nullable(),
});
export const PendingFusionSchema = z.strictObject({
  type: z.literal("fusion"),
  player: PlayerIdSchema,
  resultCard: CardSchema,
  resolution: z.strictObject({
    materials: z
      .array(z.string().regex(/^\d{3}$/u))
      .min(2)
      .max(5),
    result: z.string().regex(/^\d{3}$/u),
    steps: z.array(FusionStepSchema).min(1).max(4),
    fused: z.boolean(),
  }),
});

export const DecisiveDuelEndReasonSchema = z.enum(["lp_depleted", "deck_out", "surrender"]);

export const DuelEndReasonSchema = z.enum(["lp_depleted", "deck_out", "surrender", "draw"]);

const DecisiveDuelOutcomeSchema = z
  .strictObject({
    status: z.literal("decisive"),
    winner: PlayerIdSchema,
    loser: PlayerIdSchema,
    reason: DecisiveDuelEndReasonSchema,
  })
  .refine(({ winner, loser }) => winner !== loser, {
    message: "winner and loser must be different players",
  });

const DrawDuelOutcomeSchema = z.strictObject({
  status: z.literal("draw"),
  winner: z.null(),
  loser: z.null(),
  reason: z.literal("draw"),
});

/**
 * Lives here rather than in `./result-schema.ts` (which re-exports it) because
 * `DuelStateSchema` below has to validate `outcome`, and that module already
 * imports `PlayerIdSchema` from this one — defining it there would make the two
 * files import each other at runtime.
 */
export const DuelOutcomeSchema = z.union([DecisiveDuelOutcomeSchema, DrawDuelOutcomeSchema]);

export const AttackLockSchema = z.strictObject({
  player: PlayerIdSchema,
  untilTurn: z.number().int().min(1),
});

/**
 * At most one lock per player. The writer guarantees it by replacing an
 * existing entry instead of appending a second one; this refine keeps a
 * hand-built or tampered snapshot from smuggling in two.
 */
const AttackLocksSchema = z
  .array(AttackLockSchema)
  .refine((locks) => new Set(locks.map((lock) => lock.player)).size === locks.length, {
    message: "attackLocks must hold at most one entry per player",
  });

/**
 * Built from `DUEL_STAT_COUNTERS` rather than seven hand-written lines, so the
 * schema cannot drift from the vocabulary. `strictObject` makes an unknown
 * counter key an authoring error instead of data carried along silently, the
 * same rule `CardSchema` follows.
 */
export const DuelStatsSchema = z.strictObject(
  Object.fromEntries(
    DUEL_STAT_COUNTERS.map((counter) => [counter, z.number().int().min(0)]),
  ) as Record<(typeof DUEL_STAT_COUNTERS)[number], z.ZodNumber>,
);

export const DuelStatsByPlayerSchema = z.strictObject({
  P1: DuelStatsSchema,
  P2: DuelStatsSchema,
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
  pendingFusion: PendingFusionSchema.optional(),
  seed: z.number().int().min(0).max(0xffffffff),
  stats: DuelStatsByPlayerSchema,
  deckOutPlayer: PlayerIdSchema.optional(),
  attackLocks: AttackLocksSchema.optional(),
  outcome: DuelOutcomeSchema.optional(),
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
    equips: z.array(CardSchema),
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
  attackLocks: AttackLocksSchema.optional(),
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
const _statsMatchDeclaredType: DuelStats = {} as z.infer<typeof DuelStatsSchema>;
void _statsMatchDeclaredType;
const _statsByPlayerMatchDeclaredType: DuelStatsByPlayer = {} as z.infer<
  typeof DuelStatsByPlayerSchema
>;
void _statsByPlayerMatchDeclaredType;
const _monsterZoneMatchesDeclaredType: MonsterZone = {} as z.infer<typeof MonsterZoneSchema>;
void _monsterZoneMatchesDeclaredType;
const _spellZoneMatchesDeclaredType: SpellZone = {} as z.infer<typeof SpellZoneSchema>;
void _spellZoneMatchesDeclaredType;
const _attackLockMatchesDeclaredType: AttackLock = {} as z.infer<typeof AttackLockSchema>;
void _attackLockMatchesDeclaredType;
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
