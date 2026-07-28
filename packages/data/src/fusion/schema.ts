import { CardNumberSchema } from "@yugioh/shared";
import { z } from "zod";

const materialPairSchema = z.tuple([CardNumberSchema, CardNumberSchema]);
const classPairSchema = z.tuple([z.string().min(1), z.string().min(1)]);

/**
 * Union discriminated by `kind`, mirroring the two fusion mechanisms
 * (spec F05, Decision 4). Strict on purpose, same rule as `CardSchema`: an
 * extra field is an authoring error, not data to carry along silently.
 */
export const FusionRecipeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("materials"),
    materials: materialPairSchema,
    result: CardNumberSchema,
  }),
  z.strictObject({
    kind: z.literal("classes"),
    classes: classPairSchema,
    result: CardNumberSchema,
  }),
]);

/** Confirms only the top-level shape before parsing element by element. */
export const FusionFileSchema = z.array(z.unknown());
