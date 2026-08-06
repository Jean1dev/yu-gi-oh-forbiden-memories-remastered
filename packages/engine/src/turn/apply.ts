import {
  DomainError,
  err,
  ok,
  type Action,
  type ApplyResult,
  type DuelState,
  type Phase,
  type Result,
} from "@yugioh/shared";

import { declareAttack, resolveAttack } from "../combat/index.ts";
import { stampOutcome, surrender } from "../end/index.ts";
import { hasOpenReactionWindow } from "../events/index.ts";
import { changePosition } from "../position/index.ts";
import { activateSpell, equipCard, playFieldSpell, playSpellOrTrap } from "../spells/index.ts";
import { summonMonster } from "../summon/index.ts";
import { beginFusion, completeFusion, type FusionEngineDependencies } from "../fusion/index.ts";
import { advancePhase } from "./advance-phase.ts";

/** `undefined` when `state.phase === phase`; otherwise the `wrong_phase` error to return. */
function requirePhase(state: DuelState, phase: Phase, message: string): DomainError | undefined {
  return state.phase === phase
    ? undefined
    : new DomainError(message, "wrong_phase", { phase: state.phase });
}

/**
 * The engine's single entry point (`docs/arquitetura.md` §3.1): receives the
 * current state and a player/system action, and returns the new state plus
 * the events it emitted.
 *
 * Wraps the dispatch in the two halves of the end-of-duel rule
 * (motor-duelo-1x1 F12): nothing is accepted once the duel is over, and every
 * successful transition is checked for having just ended it. Keeping both
 * here rather than inside each action means no action can forget either one.
 */
export function apply(state: DuelState, action: Action): Result<ApplyResult, DomainError> {
  return applyWithDependencies(undefined)(state, action);
}

export function createApply(dependencies: FusionEngineDependencies) {
  return applyWithDependencies(dependencies);
}

function applyWithDependencies(dependencies: FusionEngineDependencies | undefined) {
  return (state: DuelState, action: Action): Result<ApplyResult, DomainError> => {
    if (state.outcome !== undefined) {
      return err(
        new DomainError("O duelo já terminou.", "duel_already_ended", {
          reason: state.outcome.reason,
          winner: state.outcome.winner,
        }),
      );
    }

    const result = dispatch(state, action, dependencies);
    return result.ok ? ok(stampOutcome(result.value)) : result;
  };
}

/**
 * The action dispatch itself: an exhaustive `switch` on `action.type`, with
 * the two actions whose preconditions invert the generic reaction-window
 * guard handled ahead of it.
 *
 * `resolve_attack` requires a window to BE open — specifically one over
 * `onAttackDeclared` (F11 spec Decision 3). `surrender` ignores the window
 * entirely, and does not require its player to be the active one, because the
 * PRD requires it to work at any moment (F12 spec Decision 10).
 */
function dispatch(
  state: DuelState,
  action: Action,
  dependencies: FusionEngineDependencies | undefined,
): Result<ApplyResult, DomainError> {
  if (action.type === "surrender") {
    return surrender(state, action);
  }

  if (action.type === "complete_fusion") return completeFusion(state, action);

  if (state.pendingFusion !== undefined) {
    return err(
      new DomainError(
        "The fusion result must be placed before another action.",
        "fusion_placement_required",
      ),
    );
  }

  if (action.type === "resolve_attack") {
    if (state.pending?.event.type !== "onAttackDeclared") {
      return err(
        new DomainError(
          "There is no pending attack to resolve.",
          "no_pending_attack_to_resolve",
          {},
        ),
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
    case "begin_fusion":
      return dependencies === undefined
        ? err(new DomainError("Fusion data is unavailable.", "fusion_unavailable"))
        : beginFusion(state, action, dependencies);
    case "advance_phase":
      return ok(advancePhase(state));
    case "summon_monster": {
      const phaseError = requirePhase(
        state,
        "main",
        "A monster can only be summoned during the Main phase.",
      );
      if (phaseError) return err(phaseError);
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
      const phaseError = requirePhase(
        state,
        "main",
        "A spell/trap card can only be played during the Main phase.",
      );
      if (phaseError) return err(phaseError);
      return playSpellOrTrap(state, action);
    }
    case "equip_card": {
      const phaseError = requirePhase(
        state,
        "main",
        "An equip card can only be played during the Main phase.",
      );
      if (phaseError) return err(phaseError);
      return equipCard(state, action);
    }
    case "activate_spell": {
      const phaseError = requirePhase(
        state,
        "main",
        "A spell can only be activated during the Main phase.",
      );
      if (phaseError) return err(phaseError);
      return activateSpell(state, action);
    }
    case "play_field_spell": {
      const phaseError = requirePhase(
        state,
        "main",
        "A field-spell card can only be played during the Main phase.",
      );
      if (phaseError) return err(phaseError);
      return playFieldSpell(state, action);
    }
    case "change_position":
      return changePosition(state, action.zone);
    case "declare_attack": {
      const phaseError = requirePhase(
        state,
        "battle",
        "An attack can only be declared during the Battle phase.",
      );
      if (phaseError) return err(phaseError);
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
