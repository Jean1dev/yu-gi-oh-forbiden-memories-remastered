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
  MAX_CPU_ACTIONS_PER_ADVANCE,
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
} from "./duel/types.ts";
export {
  ORCHESTRATION_ERROR_CODES,
  type AiAgent,
  type DuelAction,
  type DuelSession,
  type GetPublicDuelState,
  type MatchOrchestrationInput,
  type OrchestrationFailureReason,
} from "./duel/orchestration.ts";
export type { InitializationInput, InitializationPlayerInput } from "./duel/initialization.ts";
export type { Snapshot } from "./duel/snapshot.ts";
export type {
  ConsolidatedDuelResult,
  ConsolidatedRating,
  CreateDuelSnapshot,
  DecisiveDuelEndReason,
  DuelEndReason,
  DuelGrade,
  DuelOutcome,
  DuelResultUnavailableReason,
  EndedDuelSession,
  MinimumRatingReward,
  RatingEngine,
  RatingEvaluation,
  RatingReward,
  ReadDuelOutcome,
} from "./duel/result.ts";
export {
  ConsolidatedDuelResultSchema,
  DecisiveDuelEndReasonSchema,
  DuelEndReasonSchema,
  DuelOutcomeSchema,
  MinimumRatingRewardSchema,
  RatingEvaluationSchema,
  RatingRewardSchema,
} from "./duel/result-schema.ts";
export type {
  EffectiveAtkDef,
  EquipmentModifierProvider,
  GuardianModifierProvider,
  TerrainModifierProvider,
} from "./duel/combat-modifiers.ts";
export type {
  ActiveDeckOrigin,
  ActiveDeckVerification,
  DeckBlockReason,
  DeckComposition,
  DeckVerdict,
  DeckViolation,
  LoadedDuelDeck,
  ReadyDeck,
} from "./deck/types.ts";
export { DECK_ERROR_CODES, type DeckErrorCode } from "./deck/error-codes.ts";
export { MAX_COPIES_PER_CARD, REQUIRED_DECK_SIZE } from "./deck/constants.ts";
export type {
  DeckDraft,
  DeckDraftValidationResult,
  DeckDraftViolation,
  DeckEditBlockReason,
} from "./deck/draft.ts";
export type {
  CachedActiveDeckRecord,
  LoadedActiveDeck,
  PendingActiveDeckSave,
  SaveActiveDeckResult,
  SyncActiveDeckSummary,
} from "./deck/persistence.ts";
export {
  ActiveDeckLineSchema,
  ActiveDeckSnapshotSchema,
  DeckCompositionSchema,
  DeckVerdictSchema,
  DeckViolationSchema,
  CachedActiveDeckRecordSchema,
  PendingActiveDeckSaveSchema,
  SaveActiveDeckResponseSchema,
  type SaveActiveDeckResponse,
} from "./deck/schema.ts";
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
export type { ActiveDeckLookup, CollectionItemWithDeck } from "./collection/active-deck.ts";
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
export * from "./library/index.ts";
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
  PublicCardSchema,
  PublicDuelEventSchema,
  PublicDuelStateSchema,
  PublicHandSchema,
  PublicMonsterZoneSchema,
  PublicPlayerFieldSchema,
  PublicPlayerStateSchema,
  PublicReactionWindowSchema,
  PublicSpellZoneSchema,
  ReactionWindowSchema,
  SpellZoneSchema,
  ZoneIndexSchema,
  ZoneReferenceSchema,
  ZoneTypeSchema,
} from "./duel/schema.ts";
export {
  DIFFICULTY_LEVELS,
  ROSTER_ERROR_CODES,
  type RosterErrorCode,
} from "./duelist/constants.ts";
export type {
  DifficultyLevel,
  DifficultyParameter,
  DifficultyProfile,
  DropPool,
  DropTier,
  DropTierId,
  Duelist,
  DuelistId,
  NpcDeck,
  Roster,
} from "./duelist/types.ts";
export {
  DifficultyLevelSchema,
  DifficultyProfileSchema,
  DropPoolSchema,
  DropTierSchema,
  DuelistIdSchema,
  DuelistSchema,
  NpcDeckSchema,
  RosterSchema,
} from "./duelist/schema.ts";
export type {
  CardWeightLookup,
  DefaultCommonDropPool,
  DropRewardOutcome,
  DropRewardSource,
} from "./duelist/drop-reward.ts";
export { DefaultCommonDropPoolSchema } from "./duelist/drop-reward-schema.ts";
export { INITIAL_WALLET_STARS } from "./economy/constants.ts";
export type {
  LoadedWalletBalance,
  PendingVictoryReward,
  ReconciledWalletBalance,
  VictoryRewardEvent,
  VictoryRewardResult,
  WalletBalance,
} from "./economy/wallet.ts";
export {
  ApplyVictoryRewardResponseSchema,
  EnsureWalletResponseSchema,
  PendingVictoryRewardSchema,
  VictoryRewardEventSchema,
  WalletBalanceSchema,
  type ApplyVictoryRewardResponse,
  type EnsureWalletResponse,
} from "./economy/wallet-schema.ts";
