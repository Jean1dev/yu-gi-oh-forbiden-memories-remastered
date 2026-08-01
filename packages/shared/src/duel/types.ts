import type { Card } from "../card/types.ts";
import type { DuelOutcome } from "./outcome.ts";
import type { ReactionWindow } from "./events.ts";
import type { PlayerId } from "./player.ts";
import type { DuelEvent, EventType, JsonValue, ZoneReference } from "./events.ts";

export type { PlayerId } from "./player.ts";

/** The current phase of the turn. */
export type Phase = "draw" | "main" | "battle" | "end";

/** The four combinations of attack/defense x face-up/face-down. */
export type MonsterPosition =
  "attack_face_up" | "attack_face_down" | "defense_face_up" | "defense_face_down";

/**
 * A monster zone on the field. Discriminated union on `occupied`: the empty
 * variant never carries a card, position or turn flags; the occupied variant
 * always carries all of them.
 */
export type MonsterZone =
  | Readonly<{ occupied: false }>
  | Readonly<{
      occupied: true;
      card: Card;
      position: MonsterPosition;
      hasAttacked: boolean;
      hasChangedPosition: boolean;
    }>;

/**
 * A spell/trap zone on the field. Simpler than `MonsterZone`: no battle
 * position and no turn flags, which do not apply to these cards.
 */
export type SpellZone =
  Readonly<{ occupied: false }> | Readonly<{ occupied: true; card: Card; faceUp: boolean }>;

/** The ten zones of a player's field, with fixed identity by index. */
export type PlayerField = Readonly<{
  monsters: readonly [MonsterZone, MonsterZone, MonsterZone, MonsterZone, MonsterZone];
  spells: readonly [SpellZone, SpellZone, SpellZone, SpellZone, SpellZone];
}>;

/** A player's state: life points, hand, deck and field. */
export type PlayerState = Readonly<{
  lp: number;
  hand: readonly Card[];
  /** Ordered; index 0 = top of the deck. */
  deck: readonly Card[];
  field: PlayerField;
  /** Whether this player has already used their one hand play this turn (motor-duelo-1x1 F06). */
  handPlayUsed: boolean;
}>;

/**
 * The single source of truth of the duel: both players plus the global state
 * (active field spell, active player, turn, phase). 100% JSON-serializable
 * data — no function, class, `Map` or `Set` in any field.
 */
export type DuelState = Readonly<{
  players: Readonly<Record<PlayerId, PlayerState>>;
  /** Single and global; `null` = no active field spell. */
  activeField: Card | null;
  activePlayer: PlayerId;
  turn: number;
  phase: Phase;
  /** Absent = normal flow; present = engine paused awaiting external resolution. */
  pending?: ReactionWindow | undefined;
  /** The seed this duel was shuffled with (F03); enables deterministic replay. */
  seed: number;
  /** Set once a player fails to complete a mandatory draw (F07); consumed by F12. */
  deckOutPlayer?: PlayerId | undefined;
  /**
   * Absent while the duel is running; present once it has ended (F12). Setting
   * it freezes the state: `apply` refuses every action from then on, and no
   * transition ever overwrites or clears it.
   */
  outcome?: DuelOutcome | undefined;
}>;

export type PublicCard = Readonly<{ visible: true; card: Card }> | Readonly<{ visible: false }>;

export type PublicHand =
  Readonly<{ visible: true; cards: readonly Card[] }> | Readonly<{ visible: false; count: number }>;

export type PublicMonsterZone =
  | Readonly<{ occupied: false }>
  | Readonly<{
      occupied: true;
      card: PublicCard;
      position: MonsterPosition;
      hasAttacked: boolean;
      hasChangedPosition: boolean;
    }>;

export type PublicSpellZone =
  Readonly<{ occupied: false }> | Readonly<{ occupied: true; card: PublicCard; faceUp: boolean }>;

export type PublicPlayerField = Readonly<{
  monsters: readonly [
    PublicMonsterZone,
    PublicMonsterZone,
    PublicMonsterZone,
    PublicMonsterZone,
    PublicMonsterZone,
  ];
  spells: readonly [
    PublicSpellZone,
    PublicSpellZone,
    PublicSpellZone,
    PublicSpellZone,
    PublicSpellZone,
  ];
}>;

export type PublicPlayerState = Readonly<{
  lp: number;
  hand: PublicHand;
  remainingDeck: number;
  field: PublicPlayerField;
}>;

export type PublicDuelEvent = Readonly<{
  type: EventType;
  originPlayer: PlayerId;
  involvedCards: readonly PublicCard[];
  involvedZones: readonly ZoneReference[];
  context: Record<string, JsonValue>;
}>;

export type PublicReactionWindow = Readonly<{
  type: "reaction_window";
  event: PublicDuelEvent;
  reactingPlayer: PlayerId;
}>;

export type PublicDuelState = Readonly<{
  players: Readonly<Record<PlayerId, PublicPlayerState>>;
  activeField: Card | null;
  activePlayer: PlayerId;
  turn: number;
  phase: Phase;
  pending?: PublicReactionWindow | undefined;
}>;

const _publicEventShape: Omit<PublicDuelEvent, "involvedCards"> = {} as Omit<
  DuelEvent,
  "involvedCards"
>;
void _publicEventShape;
