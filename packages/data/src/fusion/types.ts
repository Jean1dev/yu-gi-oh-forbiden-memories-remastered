import type { CardNumber } from "@yugioh/shared";

/**
 * Fusion by two specific cards: `numero + numero -> numero`, the exact-match
 * mechanism of Forbidden Memories.
 */
export type FusionRecipeByMaterials = Readonly<{
  kind: "materials";
  materials: readonly [CardNumber, CardNumber];
  result: CardNumber;
}>;

/**
 * Fusion by monster class combination: `classe + classe -> numero`, the second
 * fusion mechanism of Forbidden Memories (PRD "regras de fusão por classe").
 */
export type FusionRecipeByClasses = Readonly<{
  kind: "classes";
  classes: readonly [string, string];
  result: CardNumber;
}>;

export type FusionRecipe = FusionRecipeByMaterials | FusionRecipeByClasses;

/** Closed set of reasons a recipe never makes it into the table. */
export type FusionRejectionReason =
  | "invalid_schema"
  | "unknown_material_number"
  | "unknown_result_number"
  | "unknown_class"
  | "duplicate_pair";

export type RejectedFusionRecipe = Readonly<{
  /** Position in the raw file array, so the maintainer can find the entry. */
  index: number;
  reason: FusionRejectionReason;
  detail: string;
}>;

/** Process evidence consumed by the maintainer, same spirit as `IngestionReport`. */
export type FusionReport = Readonly<{
  totalInFile: number;
  validRecipes: number;
  rejectedRecipes: readonly RejectedFusionRecipe[];
  /** ISO 8601. The only non-deterministic field. */
  generatedAt: string;
}>;

/**
 * The three in-memory indexes the table answers from. Internal to this
 * subsystem: consumers get the `FusionTable` methods, never the maps.
 */
export type FusionIndexes = Readonly<{
  /** Key = canonical pair of the two `numero` values. */
  byMaterialPair: ReadonlyMap<string, FusionRecipeByMaterials>;
  /** Key = canonical pair of the two `classe` values. */
  byClassPair: ReadonlyMap<string, FusionRecipeByClasses>;
  /** Reverse index: every recipe (either kind) that produces this `numero`. */
  byResult: ReadonlyMap<CardNumber, readonly FusionRecipe[]>;
}>;

/**
 * Public contract of the fusion table — what the Fusion System (cross-PRD,
 * not yet specified) and F09's bundler consume.
 *
 * Pair lookups are order-independent: `findByMaterialPair(a, b)` and
 * `findByMaterialPair(b, a)` resolve to the same recipe.
 */
export type FusionTable = Readonly<{
  findByMaterialPair(materialA: CardNumber, materialB: CardNumber): FusionRecipeByMaterials | undefined;
  findByClassPair(classA: string, classB: string): FusionRecipeByClasses | undefined;
  listByResult(numero: CardNumber): readonly FusionRecipe[];
  listAllRecipes(): readonly FusionRecipe[];
  countRecipes(): Readonly<{ byMaterials: number; byClasses: number }>;
}>;
