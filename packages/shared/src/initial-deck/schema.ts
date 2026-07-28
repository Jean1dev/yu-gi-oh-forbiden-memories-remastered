import { z } from "zod";

import { CardNumberSchema } from "../card/schema.ts";
import type { InitialPoolConfig } from "./types.ts";

/** Validates `InitialPoolConfig` at the boundary (no concrete instance ships yet — Decision 7). */
export const InitialPoolConfigSchema = z.strictObject({
  version: z.string().min(1),
  numbers: z.array(CardNumberSchema).optional(),
});

/**
 * Locks the schema and the declared type together: if one changes without the
 * other, the typecheck breaks here instead of silently drifting.
 */
const _schemaMatchesDeclaredType: InitialPoolConfig = {} as z.infer<typeof InitialPoolConfigSchema>;
void _schemaMatchesDeclaredType;
