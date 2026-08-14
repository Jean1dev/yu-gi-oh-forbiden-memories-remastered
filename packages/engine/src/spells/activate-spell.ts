import {
  DomainError,
  err,
  getSpellEffect,
  ok,
  requiresSpellTarget,
  spellPlayMode,
  type ActivateSpellAction,
  type ApplyResult,
  type DuelEvent,
  type DuelState,
  type PlayerId,
  type Result,
  type SpellEffect,
  type ZoneReference,
} from "@yugioh/shared";

import { createEvent, openReactionWindow } from "../events/index.ts";
import { hasUsedHandPlay, markHandPlayUsed } from "../turn/hand-play.ts";
import { consumeMatchingTrap } from "../traps/index.ts";
import {
  firstLifePointsAtom,
  rewriteFirstLifePointsAtom,
} from "./effects/life-points-atom.ts";
import { playersForSide } from "./effects/players-for-side.ts";
import { resolveOneShotEffect } from "./effects/resolve-one-shot.ts";
import { getOpponent } from "./opponent.ts";

/**
 * Checks the caster's chosen zone against what the effect can reach, before
 * anything is consumed.
 *
 * Only 320 Stop Defense targets today, and its text names three conditions:
 * the zone holds a monster ("an opponent's monster card"), it belongs to a
 * side the effect reaches, and it is defending ("positioned for defense").
 * Each gets its own refusal code, so the UI can say which one failed.
 */
function checkSpellTarget(
  state: DuelState,
  effect: SpellEffect,
  caster: PlayerId,
  targetZone: ZoneReference | undefined,
): DomainError | undefined {
  if (!requiresSpellTarget(effect)) {
    return targetZone === undefined
      ? undefined
      : new DomainError("This card's effect takes no target.", "spell_target_not_allowed", {
          targetZone,
        });
  }

  if (targetZone === undefined) {
    return new DomainError("This card's effect needs a target.", "spell_requires_target", {});
  }
  if (targetZone.zoneType !== "monster") {
    return new DomainError(
      "The target zone is not a monster zone.",
      "spell_target_not_monster_zone",
      { targetZone },
    );
  }

  // `effect.targets` is the only reachable shape here: `requiresSpellTarget`
  // is true exactly for `force_attack_position`.
  const reachable =
    effect.type === "force_attack_position" &&
    playersForSide(effect.targets.side, caster).includes(targetZone.player);
  if (!reachable) {
    return new DomainError("The target zone is out of this effect's reach.", "spell_target_out_of_reach", {
      targetZone,
    });
  }

  const zone = state.players[targetZone.player].field.monsters[targetZone.index];
  if (!zone.occupied) {
    return new DomainError("The target zone is empty.", "spell_target_zone_empty", { targetZone });
  }
  if (zone.position !== "defense_face_up" && zone.position !== "defense_face_down") {
    return new DomainError(
      "The target monster is not in a defense position.",
      "spell_target_not_defending",
      { targetZone },
    );
  }

  return undefined;
}

/**
 * Plays a card whose effect resolves immediately (`docs/spells/README.md` §4).
 * Assumes `apply` already confirmed the phase and the absence of an open
 * reaction window.
 *
 * The card is consumed: it leaves the hand and occupies no zone — there is no
 * graveyard in `DuelState`, so it simply leaves play.
 *
 * The effect resolves **before** the reaction window opens. That order is
 * forced by the surrounding system, not chosen for style: `apply` knows only
 * one window-consuming action (`resolve_attack`), and the shipped orchestrator
 * closes every other window with a bare `closeReactionWindow`, so a deferred
 * resolution would be silently discarded. Resolving first also lets
 * `stampOutcome` end the duel in the same transition when the effect is lethal.
 */
export function activateSpell(
  state: DuelState,
  action: ActivateSpellAction,
): Result<ApplyResult, DomainError> {
  const player = state.players[state.activePlayer];

  if (hasUsedHandPlay(state, state.activePlayer)) {
    return err(
      new DomainError("The hand play for this turn was already used.", "hand_play_already_used", {
        player: state.activePlayer,
      }),
    );
  }

  const card = player.hand[action.handIndex];
  if (card === undefined) {
    return err(
      new DomainError("The card at the given hand index is not available.", "card_unavailable", {
        handIndex: action.handIndex,
      }),
    );
  }

  const effect = getSpellEffect(card.numero);
  if (effect === undefined || spellPlayMode(card) !== "one_shot") {
    return err(
      new DomainError("This card has no effect to activate.", "invalid_activation_card_type", {
        numero: card.numero,
        tipo: card.tipo,
      }),
    );
  }

  const badTarget = checkSpellTarget(state, effect, state.activePlayer, action.targetZone);
  if (badTarget !== undefined) {
    return err(badTarget);
  }

  const consumedState: DuelState = {
    ...state,
    players: {
      ...state.players,
      [state.activePlayer]: {
        ...player,
        hand: player.hand.filter((_, index) => index !== action.handIndex),
      },
    },
  };

  let stateBeforeResolution = consumedState;
  let effectToResolve: SpellEffect = effect;
  const trapEvents: DuelEvent[] = [];
  const lifePoints = firstLifePointsAtom(effect);
  if (lifePoints !== undefined) {
    const trapOwner = getOpponent(state.activePlayer);
    const consumedTrap = consumeMatchingTrap(
      consumedState,
      trapOwner,
      (trapEffect) =>
        (trapEffect.type === "reflect_effect_damage" &&
          lifePoints.delta < 0 &&
          lifePoints.side === "opponent") ||
        (trapEffect.type === "invert_effect_heal" &&
          lifePoints.delta > 0 &&
          lifePoints.side === "caster"),
    );
    if (consumedTrap !== undefined) {
      const reflects = consumedTrap.effect.type === "reflect_effect_damage";
      stateBeforeResolution = consumedTrap.state;
      trapEvents.push(...consumedTrap.events);
      effectToResolve = rewriteFirstLifePointsAtom(effect, (atom) =>
        reflects ? { ...atom, side: "caster" } : { ...atom, delta: -atom.delta },
      );
    }
  }

  const resolved = resolveOneShotEffect(
    stateBeforeResolution,
    card,
    effectToResolve,
    state.activePlayer,
    action.targetZone,
  );
  const stateAfterHandPlay = markHandPlayUsed(resolved.state, state.activePlayer);

  const activation = createEvent({
    type: "onSet",
    originPlayer: state.activePlayer,
    involvedCards: [card],
    context: { target: "activation", effect: effect.type },
  });

  const opened = openReactionWindow(
    stateAfterHandPlay,
    activation,
    getOpponent(state.activePlayer),
  );
  if (!opened.ok) {
    throw new Error("Unreachable: apply already guaranteed no reaction window is open.");
  }

  return ok({ state: opened.value, events: [activation, ...trapEvents, ...resolved.events] });
}
