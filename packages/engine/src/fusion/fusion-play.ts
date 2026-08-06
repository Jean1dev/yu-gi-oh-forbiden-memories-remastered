import {
  DomainError,
  err,
  ok,
  type ApplyResult,
  type BeginFusionAction,
  type CardCatalogLookup,
  type CompleteFusionAction,
  type DuelState,
  type FusionSequenceResolver,
  type Result,
} from "@yugioh/shared";
import { activateSpell, equipCard, playFieldSpell, playSpellOrTrap } from "../spells/index.ts";
import { summonMonster } from "../summon/index.ts";

export type FusionEngineDependencies = Readonly<{
  resolveFusion: FusionSequenceResolver;
  getCard: CardCatalogLookup;
}>;

export function beginFusion(
  state: DuelState,
  action: BeginFusionAction,
  deps: FusionEngineDependencies,
): Result<ApplyResult, DomainError> {
  if (state.phase !== "main")
    return err(new DomainError("A fusion can only begin during the Main phase.", "wrong_phase"));
  if (state.activePlayer !== action.player)
    return err(new DomainError("Only the active player can fuse.", "not_active_player"));
  if (state.players[action.player].handPlayUsed)
    return err(
      new DomainError("The hand play for this turn was already used.", "hand_play_already_used"),
    );
  if (state.pending !== undefined || state.pendingFusion !== undefined)
    return err(new DomainError("Another resolution is pending.", "reaction_window_open"));
  if (new Set(action.handIndexes).size !== action.handIndexes.length)
    return err(new DomainError("Fusion materials must be distinct.", "duplicate_fusion_material"));
  const player = state.players[action.player];
  const cards = action.handIndexes.map((index) => player.hand[index]);
  if (cards.some((card) => card === undefined))
    return err(new DomainError("A fusion material is not in hand.", "card_not_in_hand"));
  const resolution = deps.resolveFusion(cards.map((card) => card!.numero));
  if (resolution === undefined)
    return err(
      new DomainError(
        "A fusion requires two through five materials.",
        "invalid_fusion_material_count",
      ),
    );
  const resultCard = deps.getCard(resolution.result);
  if (resultCard === undefined)
    return err(
      new DomainError("The fusion result is absent from the catalog.", "unknown_fusion_result"),
    );
  const indexes = new Set(action.handIndexes);
  return ok({
    state: {
      ...state,
      players: {
        ...state.players,
        [action.player]: { ...player, hand: player.hand.filter((_, index) => !indexes.has(index)) },
      },
      pendingFusion: { type: "fusion", player: action.player, resultCard, resolution },
    },
    events: [],
  });
}

export function completeFusion(
  state: DuelState,
  action: CompleteFusionAction,
): Result<ApplyResult, DomainError> {
  const pending = state.pendingFusion;
  if (pending === undefined)
    return err(new DomainError("There is no fusion awaiting placement.", "no_pending_fusion"));
  const player = state.players[pending.player];
  const handIndex = player.hand.length;
  const prepared: DuelState = {
    ...state,
    pendingFusion: undefined,
    players: {
      ...state.players,
      [pending.player]: {
        ...player,
        hand: [...player.hand, pending.resultCard],
        handPlayUsed: false,
      },
    },
  };
  switch (action.placement.kind) {
    case "monster":
      return summonMonster(prepared, {
        type: "summon_monster",
        player: pending.player,
        handIndex,
        zoneIndex: action.placement.zoneIndex,
        position: action.placement.position,
      });
    case "spell_or_trap":
      return playSpellOrTrap(prepared, {
        type: "play_spell_or_trap",
        handIndex,
        zoneIndex: action.placement.zoneIndex,
      });
    case "equip":
      return equipCard(prepared, {
        type: "equip_card",
        handIndex,
        targetZone: action.placement.targetZone,
      });
    case "activate_spell":
      return activateSpell(prepared, { type: "activate_spell", handIndex });
    case "field_spell":
      return playFieldSpell(prepared, { type: "play_field_spell", handIndex });
  }
}
