import type { CardNumber } from "../card/types.ts";
import type { DIFFICULTY_LEVELS } from "./constants.ts";

export type DuelistId = string;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];
export type DifficultyParameter = number | string | boolean;
export type DropTierId = string;

export type DifficultyProfile = Readonly<{
  strategy: string;
  parameters: Readonly<Record<string, DifficultyParameter>>;
}>;

export type DropTier = Readonly<{
  tier: DropTierId;
  cardNumbers: readonly CardNumber[];
  /**
   * Each candidate's chance out of 2048, verbatim from the original game's drop
   * tables. Keys are a subset of `cardNumbers`.
   *
   * Optional because a duelist this project invented has no original weights to
   * carry (`test-duelist`); absent, the draw falls back to a uniform pick,
   * which is what `selectDropCardNumber` already does without a lookup.
   */
  weights?: Readonly<Record<CardNumber, number>> | undefined;
}>;

export type DropPool = readonly DropTier[];
export type NpcDeck = readonly CardNumber[];

export type Duelist = Readonly<{
  id: DuelistId;
  name: string;
  portrait: string;
  difficulty: DifficultyLevel;
  profile: DifficultyProfile;
  deck: NpcDeck;
  dropPool: DropPool;
}>;

export type Roster = Readonly<{
  rosterVersion: string;
  duelists: readonly Duelist[];
}>;
