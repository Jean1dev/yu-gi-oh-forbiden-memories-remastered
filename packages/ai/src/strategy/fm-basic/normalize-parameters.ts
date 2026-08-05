import type { DifficultyProfile } from "@yugioh/shared";
import type { FmBasicParameters } from "./types.ts";

export function normalizeFmBasicParameters(
  parameters: DifficultyProfile["parameters"],
): FmBasicParameters {
  const aggression = parameters.aggression;
  const threshold = parameters.defensiveThreshold;
  return {
    aggression:
      typeof aggression === "number" &&
      Number.isFinite(aggression) &&
      aggression >= 0 &&
      aggression <= 1
        ? aggression
        : 0.5,
    playsSpells: typeof parameters.playsSpells === "boolean" ? parameters.playsSpells : true,
    playsFieldSpells:
      typeof parameters.playsFieldSpells === "boolean" ? parameters.playsFieldSpells : false,
    defensiveThreshold:
      typeof threshold === "number" && Number.isFinite(threshold) && threshold >= 0 ? threshold : 0,
  };
}
