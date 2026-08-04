/** Fixed number of monster zones per player (FM Phase 0 rule). */
export const TOTAL_MONSTER_ZONES = 5;

/** Fixed number of spell/trap zones per player (FM Phase 0 rule). */
export const TOTAL_SPELL_ZONES = 5;

/** Starting life points of each player (FM Phase 0 rule). */
export const INITIAL_LP = 8000;

/** Number of cards dealt to each player's opening hand (motor-duelo-1x1 F03). */
export const INITIAL_HAND_SIZE = 5;

/** Maximum number of consecutive CPU decisions before the orchestrator stops a stalled match. */
export const MAX_CPU_ACTIONS_PER_ADVANCE = 100;

/**
 * How much `DuelState.turn` advances between two turns of the same player.
 *
 * `turn` counts **player turns**, not rounds, and the two players strictly
 * alternate — so an effect measured in "N of the opponent's turns" spans
 * `N * TURNS_PER_ROUND` increments (`docs/spells/attack-lock.md` §3).
 */
export const TURNS_PER_ROUND = 2;

/**
 * How a life-point change came about, carried in `onDamage`'s `context.kind`.
 *
 * `EVENT_TYPES` stays closed at ten (PRD motor-duelo-1x1 F02,
 * `docs/arquitetura.md` §3.3), so healing reuses `onDamage` with this
 * discriminator rather than adding an eleventh event type. `amount` is always
 * a positive magnitude; the direction lives here.
 */
export const LP_CHANGE_KINDS = ["battle_damage", "effect_damage", "effect_heal"] as const;

/**
 * The closed vocabulary of duel trigger events (PRD motor-duelo-1x1 F02
 * Capabilities; `docs/arquitetura.md` §3.3). Single source of truth: `EventType`
 * (in `./events.ts`) derives from this array instead of redeclaring the list.
 */
export const EVENT_TYPES = [
  "onTurnStart",
  "onDraw",
  "onSummon",
  "onSet",
  "onFlip",
  "onPositionChange",
  "onAttackDeclared",
  "onDamage",
  "onDestroy",
  "onTurnEnd",
] as const;
