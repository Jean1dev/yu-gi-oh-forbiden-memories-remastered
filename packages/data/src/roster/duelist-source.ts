import {
  CardNumberSchema,
  DifficultyLevelSchema,
  DifficultyProfileSchema,
  NpcDeckSchema,
  type CardNumber,
  type DifficultyLevel,
  type DifficultyProfile,
  type DropTierId,
  type DuelistId,
  type NpcDeck,
} from "@yugioh/shared";
import { z } from "zod";

/**
 * The per-character source file (`packages/data/data/duelists/<id>.json`), one
 * step upstream of `roster.json`.
 *
 * It exists because the original game never gives an NPC a fixed deck: it
 * samples 40 cards out of a weighted pool at the start of every duel. The
 * roster contract (`DuelistSchema`) wants the 40 cards, so the weighted pool
 * has to live somewhere it can be reviewed, diffed and re-derived from —
 * this file. `scripts/build-roster.ts` turns a directory of these into
 * `roster.json`.
 *
 * `deckPool` and `dropPools` are extracted from the game data and overwritten
 * by `scripts/extract-fm-duelist.ts`; every other field is authored by hand
 * and preserved across extractions.
 */
export type DuelistPoolEntry = Readonly<{
  cardNumber: CardNumber;
  /** Chance out of `POOL_WEIGHT_TOTAL`, verbatim from the original game's tables. */
  weight: number;
}>;

export type DuelistDropPoolSource = Readonly<{
  tier: DropTierId;
  entries: readonly DuelistPoolEntry[];
}>;

export type DuelistSource = Readonly<{
  id: DuelistId;
  name: string;
  /** The duelist's numeric id in the original game. Absent for duelists this project invented. */
  fmDuelistId?: number | undefined;
  /** Hand size in the original game. Recorded for fidelity; the engine deals a fixed hand. */
  handSize?: number | undefined;
  difficulty: DifficultyLevel;
  portrait: string;
  profile: DifficultyProfile;
  /** Seed handed to the deck derivation, so the canonical 40 cards are reproducible. */
  deckSeed?: number | undefined;
  /** The weighted pool the 40 cards are drawn from. Mutually exclusive with `deck`. */
  deckPool?: readonly DuelistPoolEntry[] | undefined;
  /** An explicit 40-card deck, for a duelist with no pool to draw from. */
  deck?: NpcDeck | undefined;
  dropPools: readonly DuelistDropPoolSource[];
}>;

const DROP_TIER_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const DUELIST_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,31}$/;
const PORTRAIT_PATTERN = /^[a-z0-9/_-]+\.(?:jpg|png|webp)$/;

export const DuelistPoolEntrySchema = z.strictObject({
  cardNumber: CardNumberSchema,
  weight: z.number().int().positive(),
});

export const DuelistDropPoolSourceSchema = z.strictObject({
  tier: z.string().regex(DROP_TIER_PATTERN),
  entries: z.array(DuelistPoolEntrySchema).min(1),
});

/**
 * Strict on purpose, same rule as `CardSchema` and `DropEntrySchema`: an extra
 * field is an authoring error, not data to carry along silently.
 *
 * A source declares its 40 cards **either** as a weighted pool plus a seed
 * (every duelist ported from the original game) **or** as an explicit list
 * (`test-duelist`, generated from the catalog and belonging to no pool).
 * Declaring both would leave two answers to "what is this duelist's deck".
 */
export const DuelistSourceSchema = z
  .strictObject({
    id: z.string().regex(DUELIST_ID_PATTERN),
    name: z.string().min(1).max(60),
    fmDuelistId: z.number().int().positive().optional(),
    handSize: z.number().int().positive().optional(),
    difficulty: DifficultyLevelSchema,
    portrait: z.string().regex(PORTRAIT_PATTERN),
    profile: DifficultyProfileSchema,
    deckSeed: z.number().int().optional(),
    deckPool: z.array(DuelistPoolEntrySchema).min(1).optional(),
    deck: NpcDeckSchema.optional(),
    dropPools: z.array(DuelistDropPoolSourceSchema).default([]),
  })
  .refine((source) => (source.deckPool === undefined) !== (source.deck === undefined), {
    message: "a duelist source declares either deckPool or deck, never both and never neither",
    path: ["deckPool"],
  })
  .refine((source) => source.deckPool === undefined || source.deckSeed !== undefined, {
    message: "a pool-derived deck needs a recorded deckSeed",
    path: ["deckSeed"],
  });

/** Locks the schema and the declared type together, the guard `CardSchema` uses. */
const _sourceSchemaMatchesDeclaredType: DuelistSource = {} as z.infer<typeof DuelistSourceSchema>;
void _sourceSchemaMatchesDeclaredType;
