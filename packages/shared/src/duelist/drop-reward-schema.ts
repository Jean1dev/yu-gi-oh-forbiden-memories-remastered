import { z } from "zod";

import { CardNumberSchema } from "../card/schema.ts";
import type { DefaultCommonDropPool } from "./drop-reward.ts";

/**
 * Validates the balancing datum injected as the fallback pool (spec
 * free-duel/F06, Decision 4): at least one card, so a caller cannot
 * substitute an empty list for "no fallback configured" by accident.
 */
export const DefaultCommonDropPoolSchema = z.array(CardNumberSchema).min(1);

const _defaultCommonDropPoolSchemaMatchesType: DefaultCommonDropPool = [] as z.infer<
  typeof DefaultCommonDropPoolSchema
>;
void _defaultCommonDropPoolSchemaMatchesType;
