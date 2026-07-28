/** Fixed number of monster zones per player (FM Phase 0 rule). */
export const TOTAL_MONSTER_ZONES = 5;

/** Fixed number of spell/trap zones per player (FM Phase 0 rule). */
export const TOTAL_SPELL_ZONES = 5;

/** Starting life points of each player (FM Phase 0 rule). */
export const INITIAL_LP = 8000;

/** Number of cards dealt to each player's opening hand (motor-duelo-1x1 F03). */
export const INITIAL_HAND_SIZE = 5;

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
