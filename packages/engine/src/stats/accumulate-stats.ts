import type {
  Action,
  ApplyResult,
  DuelEvent,
  DuelState,
  DuelStatCounter,
  MonsterPosition,
  PlayerId,
  ZoneReference,
} from "@yugioh/shared";

import { isFaceDown } from "../position/next-position.ts";

/** One counter of one player, or nothing at all — what a single transition can be worth. */
type Increment = Readonly<{ player: PlayerId; counter: DuelStatCounter }> | undefined;

function isAttackPosture(position: MonsterPosition): boolean {
  return position === "attack_face_up" || position === "attack_face_down";
}

function sameZone(left: ZoneReference, right: ZoneReference): boolean {
  return (
    left.player === right.player && left.zoneType === right.zoneType && left.index === right.index
  );
}

/**
 * Whether the resolved attack destroyed the monster in `target`.
 *
 * `resolveAttack` emits `onDestroy` with `originPlayer: attackerPlayer` for
 * *both* destructions, so the origin cannot tell attacker from defender — the
 * zone the event carries can.
 */
function destroyedZone(events: readonly DuelEvent[], target: ZoneReference): boolean {
  return events.some(
    (event) =>
      event.type === "onDestroy" &&
      event.involvedZones.some((zone) => sameZone(zone, target)),
  );
}

/**
 * The two combat counters, derived from the state *before* the action plus the
 * events it emitted.
 *
 * The target's posture has to come from `preState`: `resolveAttack` reveals a
 * face-down defender before resolving, and empties the zone when it destroys
 * it, so by the time the result exists the position is either changed or gone.
 * Revealing preserves posture (`attack_face_down` → `attack_face_up`), so the
 * earlier read is faithful.
 */
function combatIncrement(preState: DuelState, events: readonly DuelEvent[]): Increment {
  const pending = preState.pending;
  if (pending?.event.type !== "onAttackDeclared") return undefined;

  const [attackerZone, targetZone] = pending.event.involvedZones;
  // A direct attack carries no target: nothing was defended and nothing died.
  if (attackerZone === undefined || targetZone === undefined) return undefined;

  const target = preState.players[targetZone.player].field.monsters[targetZone.index];
  if (!target.occupied) return undefined;

  const inAttackPosture = isAttackPosture(target.position);
  const destroyed = destroyedZone(events, targetZone);

  if (destroyed && inAttackPosture) {
    return { player: attackerZone.player, counter: "effectiveAttacks" };
  }
  if (!destroyed && !inAttackPosture) {
    // Credited to the defender's owner, not to whoever acted — the one
    // inversion in this accumulator.
    return { player: targetZone.player, counter: "defensiveVictories" };
  }
  return undefined;
}

/**
 * What one accepted action is worth, at most one counter of one player.
 *
 * Attribution is read off the action wherever the action names the player,
 * because the event stream cannot: `onSet` is emitted by five different paths
 * (equip, magic, field, trap and face-down summon), so counting `onSet` would
 * collapse five distinct counters into one. Events are only consulted for the
 * attack pair, where the action alone genuinely does not say what happened.
 */
function incrementFor(preState: DuelState, action: Action, result: ApplyResult): Increment {
  const active = preState.activePlayer;

  switch (action.type) {
    case "summon_monster":
      return isFaceDown(action.position)
        ? { player: action.player, counter: "faceDownPlays" }
        : undefined;
    case "play_spell_or_trap": {
      // Only traps go face down; magic and equip cards enter face up
      // (`spells/play-spell-or-trap.ts`), so only a trap is a face-down play.
      const card = preState.players[active].hand[action.handIndex];
      return card?.tipo === "armadilha"
        ? { player: active, counter: "faceDownPlays" }
        : undefined;
    }
    case "equip_card":
      return { player: active, counter: "equips" };
    case "activate_spell":
    case "play_field_spell":
      return { player: active, counter: "pureMagics" };
    case "complete_fusion":
      // The action does not name the player; the pending transaction does.
      // A fusion spends the turn's single hand play, so it is worth one
      // counter whatever the result card ends up being placed as.
      return preState.pendingFusion === undefined
        ? undefined
        : { player: preState.pendingFusion.player, counter: "fusions" };
    case "resolve_attack":
      return combatIncrement(preState, result.events);
    default:
      return undefined;
  }
}

/**
 * `apply`'s other post-step (rating-engine F01): the single place where duel
 * counters grow. Sits next to `stampOutcome` for the same reason it does —
 * every successful branch of the dispatcher passes through here, so no action,
 * present or future, can forget to be counted.
 *
 * Pure and total: never throws, never mutates its inputs, and passes the events
 * through untouched. Runs only on the `ok` branch, so a refused action is
 * counted as nothing without needing a guard of its own.
 */
export function accumulateStats(
  preState: DuelState,
  action: Action,
  result: ApplyResult,
): ApplyResult {
  const increment = incrementFor(preState, action, result);
  if (increment === undefined) return result;

  const { player, counter } = increment;
  const current = result.state.stats[player];

  return {
    ...result,
    state: {
      ...result.state,
      stats: {
        ...result.state.stats,
        [player]: { ...current, [counter]: current[counter] + 1 },
      },
    },
  };
}
