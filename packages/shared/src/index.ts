export { err, ok, type Result } from "./result.ts";
export { DomainError } from "./errors.ts";
export {
  CANONICAL_CARD_TOTAL,
  CARD_FIELD_ORDER,
  CARD_NUMBER_LENGTH,
  CARD_TYPES,
  DEFAULT_ART_PLACEHOLDER_PATH,
  GUARDIAN_STARS,
  KNOWN_CLASSES,
} from "./card/constants.ts";
export type { Card, CardCatalogLookup, CardNumber, CardType, GuardianStar } from "./card/types.ts";
export {
  CardNumberSchema,
  CardPasswordSchema,
  CardSchema,
  CardTypeSchema,
  GuardianStarSchema,
} from "./card/schema.ts";
export {
  DatasetSealSchema,
  VIOLATION_CATEGORIES,
  ValidationReportSchema,
  ValidationViolationSchema,
  ViolationCategorySchema,
  type DatasetSeal,
  type ValidationReport,
  type ValidationViolation,
  type ViolationCategory,
} from "./card/validation-report.ts";
export {
  EVENT_TYPES,
  INITIAL_HAND_SIZE,
  INITIAL_LP,
  TOTAL_MONSTER_ZONES,
  TOTAL_SPELL_ZONES,
} from "./duel/constants.ts";
export type {
  DuelState,
  MonsterPosition,
  MonsterZone,
  Phase,
  PlayerField,
  PlayerId,
  PlayerState,
  SpellZone,
} from "./duel/types.ts";
export type { InitializationInput, InitializationPlayerInput } from "./duel/initialization.ts";
export type { Snapshot } from "./duel/snapshot.ts";
export type {
  EffectiveAtkDef,
  EquipmentModifierProvider,
  GuardianModifierProvider,
  TerrainModifierProvider,
} from "./duel/combat-modifiers.ts";
export type { DeckComposition, DeckViolation, ReadyDeck } from "./deck/types.ts";
export type {
  DuelEvent,
  EventType,
  JsonValue,
  ReactionWindow,
  ZoneIndex,
  ZoneReference,
  ZoneType,
} from "./duel/events.ts";
export type { ApplyResult } from "./duel/apply-result.ts";
export type {
  CardRewardEvent,
  Collection,
  CollectionEntry,
  CollectionItem,
  CollectionOrigin,
  CollectionSnapshot,
  EnrichedCollection,
  LoadedCollection,
  PendingReward,
  RewardResult,
  SerializedCollection,
} from "./collection/types.ts";
export {
  ApplyCardRewardResponseSchema,
  CardRewardEventSchema,
  CollectionRowSchema,
  CollectionSnapshotSchema,
  PendingRewardSchema,
  SerializedCollectionSchema,
  type ApplyCardRewardResponse,
  type CollectionRow,
} from "./collection/schema.ts";
export type { CardPoolLookup } from "./initial-deck/catalog.ts";
export type { InitialPoolConfig } from "./initial-deck/types.ts";
export type {
  ArtReference,
  CollectionProgress,
  LibraryEntry,
  LibraryIndex,
  LoadedLibrary,
  ObtainedArtReference,
} from "./library/types.ts";
export type { CardArtLookup, LibraryCatalogListing } from "./library/catalog.ts";
export { ArtReferenceSchema, LibraryEntrySchema, LibraryIndexSchema } from "./library/schema.ts";
export {
  ActiveDeckRowSchema,
  InitialPoolConfigSchema,
  PersistInitialDeckResponseSchema,
  type ActiveDeckRow,
  type PersistInitialDeckResponse,
} from "./initial-deck/schema.ts";
export {
  DuelEventSchema,
  DuelStateSchema,
  EventTypeSchema,
  JsonValueSchema,
  MonsterPositionSchema,
  MonsterZoneSchema,
  PhaseSchema,
  PlayerFieldSchema,
  PlayerIdSchema,
  PlayerStateSchema,
  ReactionWindowSchema,
  SpellZoneSchema,
  ZoneIndexSchema,
  ZoneReferenceSchema,
  ZoneTypeSchema,
} from "./duel/schema.ts";
