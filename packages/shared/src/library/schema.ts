import { z } from "zod";

import { CardNumberSchema, CardSchema } from "../card/schema.ts";

export const ArtReferenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("art"), path: z.string().min(1) }),
  z.strictObject({ kind: z.literal("placeholder") }),
  z.strictObject({ kind: z.literal("silhouette") }),
]);

const ObtainedArtReferenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("art"), path: z.string().min(1) }),
  z.strictObject({ kind: z.literal("placeholder") }),
]);

const SilhouetteArtReferenceSchema = z.strictObject({ kind: z.literal("silhouette") });

/**
 * Strict on both branches (spec library/F01, Decision 2): a `false` object
 * carrying a `card` field is rejected by zod, not merely untyped — the
 * "never reveal attributes of a not-obtained card" rule is checkable at
 * runtime, not only by the compiler.
 */
export const LibraryEntrySchema = z.discriminatedUnion("obtained", [
  z.strictObject({
    obtained: z.literal(true),
    cardNumber: CardNumberSchema,
    card: CardSchema,
    art: ObtainedArtReferenceSchema,
  }),
  z.strictObject({
    obtained: z.literal(false),
    cardNumber: CardNumberSchema,
    art: SilhouetteArtReferenceSchema,
  }),
]);

/**
 * `byCardNumber` is not serializable (a `Map`) and is excluded on purpose —
 * it is reconstructed from `entries` by whoever needs it back, never
 * transported (spec library/F01 §4).
 */
export const LibraryIndexSchema = z
  .strictObject({
    entries: z.array(LibraryEntrySchema),
    total: z.number().int().min(0),
    obtained: z.number().int().min(0),
    obtainedOutsideCatalog: z.array(CardNumberSchema),
  })
  .refine((index) => index.obtained <= index.total, {
    message: "obtained must never exceed total",
    path: ["obtained"],
  });
