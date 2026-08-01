import {
  INITIAL_HAND_SIZE,
  INITIAL_LP,
  type Card,
  type DuelState,
  type InitializationInput,
  type MonsterZone,
  type PlayerField,
  type PlayerId,
  type SpellZone,
} from "@yugioh/shared";

import { createMulberry32 } from "../prng/mulberry32.ts";
import { shuffle } from "../prng/shuffle.ts";

const EMPTY_MONSTER_ZONE: MonsterZone = { occupied: false };
const EMPTY_SPELL_ZONE: SpellZone = { occupied: false };

function emptyField(): PlayerField {
  return {
    monsters: [
      EMPTY_MONSTER_ZONE,
      EMPTY_MONSTER_ZONE,
      EMPTY_MONSTER_ZONE,
      EMPTY_MONSTER_ZONE,
      EMPTY_MONSTER_ZONE,
    ],
    spells: [EMPTY_SPELL_ZONE, EMPTY_SPELL_ZONE, EMPTY_SPELL_ZONE, EMPTY_SPELL_ZONE, EMPTY_SPELL_ZONE],
  };
}

/** Splits a shuffled deck into the opening hand and the remaining deck (index 0 = top). */
function deal(shuffled: readonly Card[]): { hand: readonly Card[]; deck: readonly Card[] } {
  return {
    hand: shuffled.slice(0, INITIAL_HAND_SIZE),
    deck: shuffled.slice(INITIAL_HAND_SIZE),
  };
}

/**
 * Builds the first `DuelState` of a duel (motor-duelo-1x1 F03). Pure and
 * total: `input` is only ever produced by `buildInitializationInput`, so it
 * is always valid and this function has no failure path.
 *
 * Fixed PRNG consumption order (spec Decision 7, part of the determinism
 * contract): shuffle P1, then shuffle P2, then draw the first player — always
 * in that order, from the single generator seeded by `input.seed`.
 */
export function initDuel(input: InitializationInput): DuelState {
  const next = createMulberry32(input.seed);

  const shuffledP1 = shuffle(input.players.P1.cards, next);
  const shuffledP2 = shuffle(input.players.P2.cards, next);
  const activePlayer: PlayerId = next() < 0.5 ? "P1" : "P2";

  const { hand: handP1, deck: deckP1 } = deal(shuffledP1);
  const { hand: handP2, deck: deckP2 } = deal(shuffledP2);

  return {
    players: {
      P1: { lp: INITIAL_LP, hand: handP1, deck: deckP1, field: emptyField(), handPlayUsed: false },
      P2: { lp: INITIAL_LP, hand: handP2, deck: deckP2, field: emptyField(), handPlayUsed: false },
    },
    activeField: null,
    activePlayer,
    turn: 1,
    phase: "draw",
    seed: input.seed,
  };
}
