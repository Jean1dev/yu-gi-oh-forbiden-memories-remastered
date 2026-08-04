import type {
  DuelState,
  PlayerId,
  PublicCard,
  PublicDuelEvent,
  PublicDuelState,
  PublicMonsterZone,
  PublicPlayerField,
  PublicPlayerState,
  PublicSpellZone,
  ZoneReference,
} from "@yugioh/shared";

function isMonsterFaceUp(position: string): boolean {
  return position.endsWith("_face_up");
}

function publicMonsterZone(
  zone: DuelState["players"][PlayerId]["field"]["monsters"][number],
  revealAll: boolean,
): PublicMonsterZone {
  if (!zone.occupied) return { occupied: false };
  return {
    ...zone,
    card:
      revealAll || isMonsterFaceUp(zone.position)
        ? { visible: true, card: zone.card }
        : { visible: false },
  };
}

function publicSpellZone(
  zone: DuelState["players"][PlayerId]["field"]["spells"][number],
  revealAll: boolean,
): PublicSpellZone {
  if (!zone.occupied) return { occupied: false };
  return {
    ...zone,
    card: revealAll || zone.faceUp ? { visible: true, card: zone.card } : { visible: false },
  };
}

function publicField(state: DuelState, player: PlayerId, forPlayer: PlayerId): PublicPlayerField {
  const field = state.players[player].field;
  const revealAll = player === forPlayer;
  return {
    monsters: [
      publicMonsterZone(field.monsters[0], revealAll),
      publicMonsterZone(field.monsters[1], revealAll),
      publicMonsterZone(field.monsters[2], revealAll),
      publicMonsterZone(field.monsters[3], revealAll),
      publicMonsterZone(field.monsters[4], revealAll),
    ],
    spells: [
      publicSpellZone(field.spells[0], revealAll),
      publicSpellZone(field.spells[1], revealAll),
      publicSpellZone(field.spells[2], revealAll),
      publicSpellZone(field.spells[3], revealAll),
      publicSpellZone(field.spells[4], revealAll),
    ],
  };
}

function isReferenceVisible(
  state: DuelState,
  reference: ZoneReference | undefined,
  forPlayer: PlayerId,
): boolean {
  if (!reference || reference.player === forPlayer) return true;
  const field = state.players[reference.player].field;
  if (reference.zoneType === "monster") {
    const zone = field.monsters[reference.index];
    return !zone.occupied || isMonsterFaceUp(zone.position);
  }
  const zone = field.spells[reference.index];
  return !zone.occupied || zone.faceUp;
}

function publicEvent(state: DuelState, forPlayer: PlayerId): PublicDuelEvent | undefined {
  const event = state.pending?.event;
  if (!event) return undefined;
  return {
    ...event,
    involvedCards: event.involvedCards.map((card, index): PublicCard =>
      isReferenceVisible(state, event.involvedZones[index], forPlayer)
        ? { visible: true, card }
        : { visible: false },
    ),
  };
}

function publicPlayerState(
  state: DuelState,
  player: PlayerId,
  forPlayer: PlayerId,
): PublicPlayerState {
  const playerState = state.players[player];
  return {
    lp: playerState.lp,
    hand:
      player === forPlayer
        ? { visible: true, cards: [...playerState.hand] }
        : { visible: false, count: playerState.hand.length },
    remainingDeck: playerState.deck.length,
    field: publicField(state, player, forPlayer),
  };
}

export function getPublicDuelState(state: DuelState, forPlayer: PlayerId): PublicDuelState {
  const event = publicEvent(state, forPlayer);
  return {
    players: {
      P1: publicPlayerState(state, "P1", forPlayer),
      P2: publicPlayerState(state, "P2", forPlayer),
    },
    activeField: state.activeField,
    activePlayer: state.activePlayer,
    turn: state.turn,
    phase: state.phase,
    ...(state.pending && event
      ? {
          pending: {
            type: "reaction_window" as const,
            event,
            reactingPlayer: state.pending.reactingPlayer,
          },
        }
      : {}),
    ...(state.attackLocks ? { attackLocks: state.attackLocks } : {}),
  };
}
