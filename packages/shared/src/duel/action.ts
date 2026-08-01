import type { ZoneIndex, ZoneReference } from "./events.ts";
import type { PlayerId } from "./player.ts";
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

/**
 * Declares an attack from the monster in `attackerZoneIndex` against the
 * monster in `targetZoneIndex`, or directly at the opponent when
 * `targetZoneIndex` is absent (motor-duelo-1x1 F11). Opens a reaction window
 * on `onAttackDeclared`; resolution is a separate action (`resolve_attack`,
 * spec Decision 1) so the window can genuinely stay open in between.
 */
export type DeclareAttackAction = Readonly<{
  type: "declare_attack";
  attackerZoneIndex: ZoneIndex;
  targetZoneIndex?: ZoneIndex | undefined;
}>;

/**
 * Resolves the currently pending attack (motor-duelo-1x1 F11). Carries no
 * parameters — the attacker/target zones are read from the pending
 * `onAttackDeclared` event's `involvedZones` (spec Decision 2).
 */
export type ResolveAttackAction = Readonly<{ type: "resolve_attack" }>;

/**
 * Concedes the duel on behalf of `player` (motor-duelo-1x1 F12). Unlike every
 * other action it is accepted at any moment — from either player, active or
 * not, and even while a reaction window is open — because the PRD requires a
 * player to always be able to walk away from a duel.
 */
export type SurrenderAction = Readonly<{ type: "surrender"; player: PlayerId }>;

export type Action =
  | AdvancePhaseAction
  | SummonMonsterAction
  | PlaySpellOrTrapAction
  | PlayFieldSpellAction
  | ChangePositionAction
  | DeclareAttackAction
  | ResolveAttackAction
  | SurrenderAction;
