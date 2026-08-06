export {
  closeReactionWindow,
  createEvent,
  hasOpenReactionWindow,
  openReactionWindow,
  type CreateEventInput,
} from "./events/index.ts";
export { createMulberry32, shuffle } from "./prng/index.ts";
export {
  buildInitializationInput,
  initDuel,
  type BuildInitializationInputArgs,
  type BuildInitializationInputDeps,
  type DeckValidator,
  type SeedGenerator,
} from "./initialization/index.ts";
export {
  calculateEffectiveAtkDef,
  declareAttack,
  resolveAttack,
  resolveCombatTable,
  type CombatContext,
  type ModifierProviders,
  type ResolveCombatTableInput,
  type ResolveCombatTableResult,
} from "./combat/index.ts";
export { checkDuelEnd, isDuelOver, stampOutcome, surrender } from "./end/index.ts";
export { load, serialize } from "./serialization/index.ts";
export {
  apply,
  createApply,
  hasUsedHandPlay,
  isFirstDuelTurn,
  markHandPlayUsed,
} from "./turn/index.ts";
export { beginFusion, completeFusion, type FusionEngineDependencies } from "./fusion/index.ts";
export {
  drawUpToHandSize,
  getDeckOutPlayer,
  hasDeckedOut,
  resolveDrawPhase,
} from "./draw/index.ts";
export { summonMonster } from "./summon/index.ts";
export {
  activateSpell,
  attackLockUntilTurn,
  equipCard,
  equipCombatProviders,
  getOpponent,
  isAttackLocked,
  playFieldSpell,
  playSpellOrTrap,
  playersForSide,
  resolveOneShotEffect,
  sumEquipBonuses,
  withAttackLock,
} from "./spells/index.ts";
export { changePosition, isFaceDown, nextPosition } from "./position/index.ts";
export { accumulateStats, emptyDuelStats, emptyDuelStatsByPlayer } from "./stats/index.ts";
