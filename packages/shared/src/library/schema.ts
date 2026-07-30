import { z } from "zod";

import { CardNumberSchema, CardSchema } from "../card/schema.ts";
import {
  COLLECTION_STATUS_FILTERS,
  LIBRARY_FILTER_TYPES,
  LIBRARY_SORT_DIRECTIONS,
  LIBRARY_SORT_FIELDS,
} from "./filters.ts";

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

export const LibraryFilterTypeSchema = z.enum(LIBRARY_FILTER_TYPES);
export const CollectionStatusFilterSchema = z.enum(COLLECTION_STATUS_FILTERS);
export const LibrarySortFieldSchema = z.enum(LIBRARY_SORT_FIELDS);
export const LibrarySortDirectionSchema = z.enum(LIBRARY_SORT_DIRECTIONS);

export const LibrarySortSchema = z.strictObject({
  field: LibrarySortFieldSchema,
  direction: LibrarySortDirectionSchema,
});

export const LibraryFiltersSchema = z.strictObject({
  types: z.array(LibraryFilterTypeSchema).refine((types) => new Set(types).size === types.length, {
    message: "filter types must not contain duplicates",
  }),
  status: CollectionStatusFilterSchema,
  sort: LibrarySortSchema,
});

export const LibraryQueryResultSchema = z.strictObject({
  entries: z.array(LibraryEntrySchema),
  totalBefore: z.number().int().min(0),
  totalAfter: z.number().int().min(0),
  activeFilters: LibraryFiltersSchema,
  hasNonDefaultFilters: z.boolean(),
});
