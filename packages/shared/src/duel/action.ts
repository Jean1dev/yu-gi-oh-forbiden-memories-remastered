import type { ZoneIndex, ZoneReference } from "./events.ts";
import type { SummonMonsterAction } from "./summon-monster-action.ts";

/**
 * The union of every action a player (or the system) can submit to the
 * engine's `apply` dispatcher (`docs/arquitetura.md` §3.1). Starts with a
 * single variant; motor-duelo-1x1 F07-F12 each add their own variant to this
 * same union, never redefining it (same additive discipline as `DuelState`
 * across F01-F05).
 */
export type AdvancePhaseAction = Readonly<{ type: "advance_phase" }>;

/**
 * Places a magic/trap/equipment card from the active player's hand into a
 * free spell/trap zone (motor-duelo-1x1 F09). The engine does not
 * distinguish a field-spell card from an effect-spell card by schema (both
 * are `tipo: "magica"`) — whoever builds the action picks this variant or
 * `PlayFieldSpellAction` from knowledge outside the engine.
 */
export type PlaySpellOrTrapAction = Readonly<{
  type: "play_spell_or_trap";
  handIndex: number;
  zoneIndex: ZoneIndex;
}>;

/** Plays a field-spell card from hand, replacing the single `activeField` slot (motor-duelo-1x1 F09). */
export type PlayFieldSpellAction = Readonly<{
  type: "play_field_spell";
  handIndex: number;
}>;

/**
 * Changes the position of a monster already on the field (motor-duelo-1x1
 * F10). Carries no target position — the engine computes the deterministic
 * transition from the monster's current position (`nextPosition`).
 */
export type ChangePositionAction = Readonly<{ type: "change_position"; zone: ZoneReference }>;

export type Action =
  | AdvancePhaseAction
  | SummonMonsterAction
  | PlaySpellOrTrapAction
  | PlayFieldSpellAction
  | ChangePositionAction;
