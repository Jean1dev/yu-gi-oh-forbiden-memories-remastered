import { z } from "zod";

import { CardNumberSchema } from "../card/schema.ts";
import { MAX_COPIES_PER_CARD, REQUIRED_DECK_SIZE } from "../deck/constants.ts";
import { DIFFICULTY_LEVELS } from "./constants.ts";
import type { Duelist, Roster } from "./types.ts";

const DUELIST_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,31}$/;
const DROP_TIER_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const PORTRAIT_PATTERN = /^[a-z0-9/_-]+\.(?:jpg|png|webp)$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export const DuelistIdSchema = z.string().regex(DUELIST_ID_PATTERN);
export const DifficultyLevelSchema = z.enum(DIFFICULTY_LEVELS);

const DifficultyParameterSchema = z.union([z.number(), z.string(), z.boolean()]);

export const DifficultyProfileSchema = z.strictObject({
  strategy: z.string().min(1),
  parameters: z.record(z.string().min(1), DifficultyParameterSchema).default({}),
});

export const DropTierSchema = z
  .strictObject({
    tier: z.string().regex(DROP_TIER_PATTERN),
    cardNumbers: z.array(CardNumberSchema).min(1),
    weights: z.record(CardNumberSchema, z.number().int().positive()).optional(),
  })
  .refine((entry) => new Set(entry.cardNumbers).size === entry.cardNumbers.length, {
    message: "drop tier cannot contain duplicate card numbers",
    path: ["cardNumbers"],
  })
  .refine(
    (entry) =>
      entry.weights === undefined ||
      Object.keys(entry.weights).every((cardNumber) =>
        entry.cardNumbers.includes(cardNumber as (typeof entry.cardNumbers)[number]),
      ),
    {
      message: "drop tier weights can only cover card numbers listed in the tier",
      path: ["weights"],
    },
  );

export const DropPoolSchema = z
  .array(DropTierSchema)
  .refine((pool) => new Set(pool.map((entry) => entry.tier)).size === pool.length, {
    message: "drop pool cannot contain duplicate tiers",
  })
  .default([]);

export const NpcDeckSchema = z
  .array(CardNumberSchema)
  .length(REQUIRED_DECK_SIZE)
  .refine(
    (deck) => {
      const copies = new Map<string, number>();
      return deck.every((cardNumber) => {
        const next = (copies.get(cardNumber) ?? 0) + 1;
        copies.set(cardNumber, next);
        return next <= MAX_COPIES_PER_CARD;
      });
    },
    { message: "deck cannot exceed the maximum copies per card" },
  );

export const DuelistSchema = z.strictObject({
  id: DuelistIdSchema,
  name: z.string().min(1).max(60),
  portrait: z.string().regex(PORTRAIT_PATTERN),
  difficulty: DifficultyLevelSchema,
  profile: DifficultyProfileSchema,
  deck: NpcDeckSchema,
  dropPool: DropPoolSchema,
});

export const RosterSchema = z.strictObject({
  rosterVersion: z.string().regex(SEMVER_PATTERN),
  duelists: z.array(DuelistSchema),
});

const _duelistSchemaMatchesType: Duelist = {} as z.infer<typeof DuelistSchema>;
const _rosterSchemaMatchesType: Roster = {} as z.infer<typeof RosterSchema>;
void _duelistSchemaMatchesType;
void _rosterSchemaMatchesType;
