import type { DuelSession } from "@yugioh/shared";
import { canSurrender } from "./surrender.ts";

export type ExitDecision = "blocked" | "allowed";

export function interceptDuelExit(
  session: DuelSession,
  openConfirmation: () => void,
): ExitDecision {
  if (!canSurrender(session)) return "allowed";

  openConfirmation();
  return "blocked";
}
