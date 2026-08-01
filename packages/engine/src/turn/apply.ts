import { DomainError, err, ok, type Action, type ApplyResult, type DuelState, type Result } from "@yugioh/shared";

import { hasOpenReactionWindow } from "../events/index.ts";
import { playFieldSpell, playSpellOrTrap } from "../spells/index.ts";
import { summonMonster } from "../summon/index.ts";
import { advancePhase } from "./advance-phase.ts";

/**
 * The engine's single entry point (`docs/arquitetura.md` §3.1): receives the
 * current state and a player/system action, and returns the new state plus
 * the events it emitted. An exhaustive `switch` on `action.type` — F07-F12
 * each add a `case` to this same function, never a separate dispatcher.
 */
export function apply(state: DuelState, action: Action): Result<ApplyResult, DomainError> {
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
    default: {
      // Assigning `action` (not `action.type`) to `never` here works around a
      // TypeScript 6.0.3 narrowing bug where `const x: never = action.type`
      // reports `action.type` as `any` instead of the exhausted literal union.
      const exhaustive: never = action;
      throw new Error(`Unhandled action type: ${JSON.stringify(exhaustive)}`);
    }
  }
}
