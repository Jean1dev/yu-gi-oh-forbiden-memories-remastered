import { z } from "zod";

import type { Action } from "./action.ts";

export const AdvancePhaseActionSchema = z.strictObject({ type: z.literal("advance_phase") });

/** Will become `z.discriminatedUnion("type", [...])` once a second variant exists (F07-F12). */
export const ActionSchema = AdvancePhaseActionSchema;

const _schemaMatchesDeclaredType: Action = {} as z.infer<typeof ActionSchema>;
void _schemaMatchesDeclaredType;
