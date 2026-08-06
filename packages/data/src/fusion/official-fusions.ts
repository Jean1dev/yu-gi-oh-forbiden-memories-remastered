import recipes from "../../rules-data/fusions.json" with { type: "json" };
import { FusionFileSchema } from "./schema.ts";
import type { FusionRecipe } from "./types.ts";

/** Generated, validated fusion recipes bundled for offline duel runtimes. */
export const OFFICIAL_FUSIONS: readonly FusionRecipe[] = Object.freeze(
  FusionFileSchema.parse(recipes) as FusionRecipe[],
);
