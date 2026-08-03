import type {
  Card,
  DuelAction,
  DuelState,
  MonsterPosition,
  PlayerId,
  ZoneIndex,
  ZoneReference,
} from "@yugioh/shared";
import { spellPlayMode } from "@yugioh/shared";

const PLAYER: PlayerId = "P1";
const OPPONENT: PlayerId = "P2";
const SUMMONABLE_TYPES = new Set(["monstro", "ritual"]);
const SPELL_TRAP_TYPES = new Set(["armadilha", "equipamento", "magica"]);
const ATTACK_POSITIONS = new Set<MonsterPosition>(["attack_face_up", "attack_face_down"]);

export type DuelIntent =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "card_selected"; handIndex: number }>
  | Readonly<{
      kind: "choosing_zone";
      handIndex: number;
      row: "monster" | "spell";
      shortcutPosition?: MonsterPosition | undefined;
    }>
  | Readonly<{ kind: "choosing_position"; handIndex: number; zoneIndex: ZoneIndex }>
  | Readonly<{ kind: "choosing_equip_target"; handIndex: number }>
  | Readonly<{ kind: "choosing_attacker" }>
  | Readonly<{ kind: "choosing_target"; attackerZoneIndex: ZoneIndex }>
  | Readonly<{ kind: "choosing_flip" }>;

export type ActionSlotId =
  | "summon"
  | "set"
  | "place"
  | "equip"
  | "activate"
  | "place_terrain"
  | "attack"
  | "change_position"
  | "direct_attack"
  | "cancel"
  | "advance_phase"
  | "none";

export type ActionSlot = Readonly<{
  id: ActionSlotId;
  label: string;
  variant: "primary" | "secondary";
  disabled: boolean;
}>;

export type DuelAffordances = Readonly<{
  canAct: boolean;
  canSummon: boolean;
  canPlaceSpell: boolean;
  canEquip: boolean;
  canActivateSpell: boolean;
  canPlayTerrain: boolean;
  canAttack: boolean;
  canDirectAttack: boolean;
  canChangePosition: boolean;
  canAdvancePhase: boolean;
}>;

export type ZoneAffordance = "idle" | "selectable" | "selected" | "target";

export type InteractionEvent =
  | Readonly<{ type: "select_hand_card"; handIndex: number }>
  | Readonly<{ type: "activate_zone"; reference: ZoneReference }>
  | Readonly<{ type: "choose_position"; position: MonsterPosition }>
  | Readonly<{ type: "invoke_slot"; id: ActionSlotId }>
  | Readonly<{ type: "cancel" }>;

const idleIntent: DuelIntent = { kind: "idle" };

function emptySlot(variant: ActionSlot["variant"] = "secondary"): ActionSlot {
  return { id: "none", label: "-", variant, disabled: true };
}

function slot(id: ActionSlotId, label: string, disabled: boolean, variant: ActionSlot["variant"] = "secondary"): ActionSlot {
  return { id, label, variant, disabled };
}

function isZoneIndex(index: number): index is ZoneIndex {
  return index >= 0 && index <= 4 && Number.isInteger(index);
}

function selectedHandIndex(intent: DuelIntent): number | undefined {
  switch (intent.kind) {
    case "card_selected":
    case "choosing_zone":
    case "choosing_position":
    case "choosing_equip_target":
      return intent.handIndex;
    default:
      return undefined;
  }
}

function selectedCard(state: DuelState, intent: DuelIntent): Card | undefined {
  const handIndex = selectedHandIndex(intent);
  return handIndex === undefined ? undefined : state.players[PLAYER].hand[handIndex];
}

function hasFreeMonsterZone(state: DuelState): boolean {
  return state.players[PLAYER].field.monsters.some((zone) => !zone.occupied);
}

function hasFreeSpellZone(state: DuelState): boolean {
  return state.players[PLAYER].field.spells.some((zone) => !zone.occupied);
}

function canUseHand(state: DuelState): boolean {
  return state.phase === "main" && state.activePlayer === PLAYER && !state.players[PLAYER].handPlayUsed;
}

function hasOpponentMonsters(state: DuelState): boolean {
  return state.players[OPPONENT].field.monsters.some((zone) => zone.occupied);
}

function attackerIsReady(state: DuelState, index: ZoneIndex): boolean {
  const zone = state.players[PLAYER].field.monsters[index];
  return zone.occupied && ATTACK_POSITIONS.has(zone.position) && !zone.hasAttacked;
}

function canAnyMonsterAttack(state: DuelState): boolean {
  return state.players[PLAYER].field.monsters.some(
    (zone) => zone.occupied && ATTACK_POSITIONS.has(zone.position) && !zone.hasAttacked,
  );
}

function playerIsAttackLocked(state: DuelState): boolean {
  const lock = state.attackLocks?.find((entry) => entry.player === PLAYER);
  return lock !== undefined && state.turn < lock.untilTurn;
}

function canAnyMonsterChangePosition(state: DuelState): boolean {
  return state.players[PLAYER].field.monsters.some((zone) => zone.occupied && !zone.hasChangedPosition);
}

function describeAsPlayerTurn(state: DuelState, intent: DuelIntent): DuelAffordances {
  return describeAffordances({ state, isPlayerTurn: state.activePlayer === PLAYER, busy: false, intent });
}

export function describeAffordances(input: Readonly<{
  state: DuelState;
  isPlayerTurn: boolean;
  busy: boolean;
  intent: DuelIntent;
}>): DuelAffordances {
  const { state, isPlayerTurn, busy, intent } = input;
  const canAct = isPlayerTurn && !busy && state.outcome === undefined;
  const card = selectedCard(state, intent);
  const canPlayFromHand = canAct && canUseHand(state);
  const canSummon =
    canPlayFromHand && card !== undefined && SUMMONABLE_TYPES.has(card.tipo) && hasFreeMonsterZone(state);
  const canPlaceSpell =
    canPlayFromHand &&
    card !== undefined &&
    SPELL_TRAP_TYPES.has(card.tipo) &&
    spellPlayMode(card) === "place" &&
    hasFreeSpellZone(state);
  const canEquip =
    canPlayFromHand &&
    card !== undefined &&
    spellPlayMode(card) === "equip" &&
    state.players[PLAYER].field.monsters.some((zone) => zone.occupied);
  const canActivateSpell = canPlayFromHand && card !== undefined && spellPlayMode(card) === "one_shot";
  const canPlayTerrain = canPlayFromHand && card !== undefined && spellPlayMode(card) === "terrain";
  const battleActionsAvailable = canAct && state.phase === "battle" && state.activePlayer === PLAYER;
  const canAttack =
    battleActionsAvailable && state.turn > 1 && !playerIsAttackLocked(state) && canAnyMonsterAttack(state);
  return {
    canAct,
    canSummon,
    canPlaceSpell,
    canEquip,
    canActivateSpell,
    canPlayTerrain,
    canAttack,
    canDirectAttack: canAttack && !hasOpponentMonsters(state),
    canChangePosition: battleActionsAvailable && canAnyMonsterChangePosition(state),
    canAdvancePhase: canAct && state.activePlayer === PLAYER,
  };
}

export function describeActionSlots(
  input: Readonly<{ intent: DuelIntent; state: DuelState }>,
  affordances: DuelAffordances,
): readonly [ActionSlot, ActionSlot, ActionSlot] {
  const { intent, state } = input;
  const advance = slot("advance_phase", "Passar Fase", !affordances.canAdvancePhase, "primary");

  if (
    intent.kind === "choosing_zone" ||
    intent.kind === "choosing_position" ||
    intent.kind === "choosing_equip_target" ||
    intent.kind === "choosing_attacker" ||
    intent.kind === "choosing_target" ||
    intent.kind === "choosing_flip"
  ) {
    return [
      slot("cancel", "Cancelar", !affordances.canAct),
      slot("direct_attack", "Ataque Direto", !(intent.kind === "choosing_target" && affordances.canDirectAttack)),
      advance,
    ];
  }

  if (intent.kind === "card_selected") {
    const card = state.players[PLAYER].hand[intent.handIndex];
    if (card && SUMMONABLE_TYPES.has(card.tipo)) {
      return [
        slot("summon", "Invocar", !affordances.canSummon),
        slot("set", "Definir", !affordances.canSummon),
        advance,
      ];
    }
    if (card && SPELL_TRAP_TYPES.has(card.tipo)) {
      switch (spellPlayMode(card)) {
        case "equip":
          return [slot("equip", "Equipar", !affordances.canEquip), emptySlot(), advance];
        case "one_shot":
          return [slot("activate", "Ativar", !affordances.canActivateSpell), emptySlot(), advance];
        case "terrain":
          return [slot("place_terrain", "Campo", !affordances.canPlayTerrain), emptySlot(), advance];
        case "place":
          return [slot("place", "Colocar", !affordances.canPlaceSpell), emptySlot(), advance];
      }
    }
  }

  if (state.phase === "battle") {
    return [
      slot("attack", "Atacar", !affordances.canAttack),
      slot("change_position", "Mudar Posicao", !affordances.canChangePosition),
      advance,
    ];
  }

  return [emptySlot(), emptySlot(), advance];
}

function activateZoneForChoice(
  intent: Extract<DuelIntent, { kind: "choosing_zone" }>,
  reference: ZoneReference,
  state: DuelState,
): Readonly<{ intent: DuelIntent; action?: DuelAction }> {
  if (reference.player !== PLAYER || reference.zoneType !== intent.row) return { intent };
  if (intent.row === "monster") {
    const zone = state.players[PLAYER].field.monsters[reference.index];
    if (zone.occupied) return { intent };
    if (intent.shortcutPosition) {
      return {
        intent: idleIntent,
        action: {
          type: "summon_monster",
          player: PLAYER,
          handIndex: intent.handIndex,
          zoneIndex: reference.index,
          position: intent.shortcutPosition,
        },
      };
    }
    return { intent: { kind: "choosing_position", handIndex: intent.handIndex, zoneIndex: reference.index } };
  }

  const zone = state.players[PLAYER].field.spells[reference.index];
  if (zone.occupied) return { intent };
  return {
    intent: idleIntent,
    action: { type: "play_spell_or_trap", handIndex: intent.handIndex, zoneIndex: reference.index },
  };
}

export function reduceIntent(
  intent: DuelIntent,
  event: InteractionEvent,
  state: DuelState,
): Readonly<{ intent: DuelIntent; action?: DuelAction }> {
  if (event.type === "cancel") return { intent: idleIntent };
  const affordances = describeAsPlayerTurn(state, intent);

  if (event.type === "select_hand_card") {
    if (!affordances.canAct || state.players[PLAYER].hand[event.handIndex] === undefined) return { intent };
    return { intent: { kind: "card_selected", handIndex: event.handIndex } };
  }

  if (event.type === "invoke_slot") {
    switch (event.id) {
      case "advance_phase":
        return affordances.canAdvancePhase ? { intent: idleIntent, action: { type: "advance_phase" } } : { intent };
      case "summon":
        return intent.kind === "card_selected" && affordances.canSummon
          ? { intent: { kind: "choosing_zone", handIndex: intent.handIndex, row: "monster" } }
          : { intent };
      case "set":
        return intent.kind === "card_selected" && affordances.canSummon
          ? {
              intent: {
                kind: "choosing_zone",
                handIndex: intent.handIndex,
                row: "monster",
                shortcutPosition: "defense_face_down",
              },
            }
          : { intent };
      case "place":
        return intent.kind === "card_selected" && affordances.canPlaceSpell
          ? { intent: { kind: "choosing_zone", handIndex: intent.handIndex, row: "spell" } }
          : { intent };
      case "equip":
        return intent.kind === "card_selected" && affordances.canEquip
          ? { intent: { kind: "choosing_equip_target", handIndex: intent.handIndex } }
          : { intent };
      case "activate":
        return intent.kind === "card_selected" && affordances.canActivateSpell
          ? { intent: idleIntent, action: { type: "activate_spell", handIndex: intent.handIndex } }
          : { intent };
      case "place_terrain":
        return intent.kind === "card_selected" && affordances.canPlayTerrain
          ? { intent: idleIntent, action: { type: "play_field_spell", handIndex: intent.handIndex } }
          : { intent };
      case "attack":
        return affordances.canAttack ? { intent: { kind: "choosing_attacker" } } : { intent };
      case "direct_attack":
        return intent.kind === "choosing_target" && affordances.canDirectAttack
          ? {
              intent: idleIntent,
              action: { type: "declare_attack", attackerZoneIndex: intent.attackerZoneIndex },
            }
          : { intent };
      case "change_position":
        return affordances.canChangePosition ? { intent: { kind: "choosing_flip" } } : { intent };
      case "cancel":
        return { intent: idleIntent };
      case "none":
        return { intent };
    }
  }

  if (event.type === "activate_zone") {
    const { reference } = event;
    switch (intent.kind) {
      case "choosing_zone":
        return activateZoneForChoice(intent, reference, state);
      case "choosing_attacker":
        return reference.player === PLAYER &&
          reference.zoneType === "monster" &&
          attackerIsReady(state, reference.index)
          ? { intent: { kind: "choosing_target", attackerZoneIndex: reference.index } }
          : { intent };
      case "choosing_equip_target": {
        const zone =
          reference.player === PLAYER && reference.zoneType === "monster"
            ? state.players[PLAYER].field.monsters[reference.index]
            : undefined;
        return zone?.occupied
          ? {
              intent: idleIntent,
              action: { type: "equip_card", handIndex: intent.handIndex, targetZone: reference },
            }
          : { intent };
      }
      case "choosing_target":
        return reference.player === OPPONENT &&
          reference.zoneType === "monster" &&
          state.players[OPPONENT].field.monsters[reference.index].occupied
          ? {
              intent: idleIntent,
              action: {
                type: "declare_attack",
                attackerZoneIndex: intent.attackerZoneIndex,
                targetZoneIndex: reference.index,
              },
            }
          : { intent };
      case "choosing_flip": {
        const zone =
          reference.player === PLAYER && reference.zoneType === "monster"
            ? state.players[PLAYER].field.monsters[reference.index]
            : undefined;
        return zone && zone.occupied && !zone.hasChangedPosition
          ? { intent: idleIntent, action: { type: "change_position", zone: reference } }
          : { intent };
      }
      default:
        return { intent };
    }
  }

  if (event.type === "choose_position") {
    if (intent.kind !== "choosing_position") return { intent };
    return {
      intent: idleIntent,
      action: {
        type: "summon_monster",
        player: PLAYER,
        handIndex: intent.handIndex,
        zoneIndex: intent.zoneIndex,
        position: event.position,
      },
    };
  }

  return { intent };
}

export function zoneAffordance(
  state: DuelState,
  intent: DuelIntent,
  reference: ZoneReference,
): ZoneAffordance {
  if (intent.kind === "choosing_position") {
    return reference.player === PLAYER &&
      reference.zoneType === "monster" &&
      reference.index === intent.zoneIndex
      ? "selected"
      : "idle";
  }

  if (intent.kind === "choosing_zone") {
    if (reference.player !== PLAYER || reference.zoneType !== intent.row) return "idle";
    const zone =
      intent.row === "monster"
        ? state.players[PLAYER].field.monsters[reference.index]
        : state.players[PLAYER].field.spells[reference.index];
    return zone.occupied ? "idle" : "selectable";
  }

  if (intent.kind === "choosing_attacker") {
    return reference.player === PLAYER &&
      reference.zoneType === "monster" &&
      attackerIsReady(state, reference.index)
      ? "selectable"
      : "idle";
  }

  if (intent.kind === "choosing_equip_target") {
    const zone =
      reference.player === PLAYER && reference.zoneType === "monster"
        ? state.players[PLAYER].field.monsters[reference.index]
        : undefined;
    return zone?.occupied ? "target" : "idle";
  }

  if (intent.kind === "choosing_target") {
    if (
      reference.player === PLAYER &&
      reference.zoneType === "monster" &&
      reference.index === intent.attackerZoneIndex
    ) {
      return "selected";
    }
    return reference.player === OPPONENT &&
      reference.zoneType === "monster" &&
      state.players[OPPONENT].field.monsters[reference.index].occupied
      ? "target"
      : "idle";
  }

  if (intent.kind === "choosing_flip") {
    const zone =
      reference.player === PLAYER && reference.zoneType === "monster"
        ? state.players[PLAYER].field.monsters[reference.index]
        : undefined;
    return zone && zone.occupied && !zone.hasChangedPosition ? "selectable" : "idle";
  }

  return "idle";
}

export function zoneReference(player: PlayerId, zoneType: ZoneReference["zoneType"], index: number): ZoneReference {
  if (!isZoneIndex(index)) throw new Error(`Invalid zone index: ${index}`);
  return { player, zoneType, index };
}
