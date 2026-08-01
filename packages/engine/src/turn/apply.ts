import { DomainError, err, ok, type Action, type ApplyResult, type DuelState, type Result } from "@yugioh/shared";

import { declareAttack, resolveAttack } from "../combat/index.ts";
import { hasOpenReactionWindow } from "../events/index.ts";
import { changePosition } from "../position/index.ts";
import { playFieldSpell, playSpellOrTrap } from "../spells/index.ts";
import { summonMonster } from "../summon/index.ts";
import { advancePhase } from "./advance-phase.ts";

/**
 * The engine's single entry point (`docs/arquitetura.md` §3.1): receives the
 * current state and a player/system action, and returns the new state plus
 * the events it emitted. An exhaustive `switch` on `action.type` — F07-F12
 * each add a `case` to this same function, never a separate dispatcher.
 *
 * `resolve_attack` is handled before the generic reaction-window guard
 * below: unlike every other action, its precondition is that a window IS
 * open — specifically one over `onAttackDeclared` (motor-duelo-1x1 F11 spec
 * Decision 3), not that one is absent.
 */
export function apply(state: DuelState, action: Action): Result<ApplyResult, DomainError> {
  if (action.type === "resolve_attack") {
    if (state.pending?.event.type !== "onAttackDeclared") {
      return err(
        new DomainError("There is no pending attack to resolve.", "no_pending_attack_to_resolve", {}),
      );
    }
    return resolveAttack(state);
  }

  if (hasOpenReactionWindow(state)) {
    return err(
      new DomainError(
        "Não é possível avançar de fase com uma janela de reação aberta.",
        "reaction_window_open",
        { pendingEventType: state.pending?.event.type },
      ),
    );
  }

  switch (action.type) {
    case "advance_phase":
      return ok(advancePhase(state));
    case "summon_monster": {
      if (state.phase !== "main") {
        return err(
          new DomainError("A monster can only be summoned during the Main phase.", "wrong_phase", {
            phase: state.phase,
          }),
        );
      }
      if (state.activePlayer !== action.player) {
        return err(
          new DomainError("Only the active player can act.", "not_active_player", {
            activePlayer: state.activePlayer,
            actionPlayer: action.player,
          }),
        );
      }
      return summonMonster(state, action);
    }
    case "play_spell_or_trap": {
      if (state.phase !== "main") {
        return err(
          new DomainError(
            "A spell/trap card can only be played during the Main phase.",
            "wrong_phase",
            { phase: state.phase },
          ),
        );
      }
      return playSpellOrTrap(state, action);
    }
    case "play_field_spell": {
      if (state.phase !== "main") {
        return err(
          new DomainError("A field-spell card can only be played during the Main phase.", "wrong_phase", {
            phase: state.phase,
          }),
        );
      }
      return playFieldSpell(state, action);
    }
    case "change_position":
      return changePosition(state, action.zone);
    case "declare_attack": {
      if (state.phase !== "battle") {
        return err(
          new DomainError("An attack can only be declared during the Battle phase.", "wrong_phase", {
            phase: state.phase,
          }),
        );
      }
      return declareAttack(state, action);
    }
    default: {
      // Assigning `action` (not `action.type`) to `never` here works around a
      // TypeScript 6.0.3 narrowing bug where `const x: never = action.type`
      // reports `action.type` as `any` instead of the exhausted literal union.
      const exhaustive: never = action;
      throw new Error(`Unhandled action type: ${JSON.stringify(exhaustive)}`);
    }
  }
}
