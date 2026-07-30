"use client";

import {
  DomainError,
  type ConsolidatedDuelResult,
  type DropRewardOutcome,
  type Result,
  type RewardResult,
} from "@yugioh/shared";
import { useEffect, useState } from "react";

export type GrantedCardDropView = Readonly<{
  outcome: DropRewardOutcome;
  reward: RewardResult;
}>;

export type GrantCardDropForResult = (
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
) => Promise<Result<GrantedCardDropView, DomainError>>;

export type CardDropRewardViewState =
  | Readonly<{ status: "not_applicable" }>
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "granted"; granted: GrantedCardDropView }>
  | Readonly<{ status: "unavailable"; error: DomainError }>;

const NO_GRANT_FUNCTION_ERROR = new DomainError(
  "No grantCardDrop function was configured for this result.",
  "reward_apply_unavailable",
);

/**
 * Triggers `grantCardDrop` only when the consolidated result is a victory
 * (spec free-duel/F06 §3, step 14) — defeat, draw and `unavailable` never
 * call it, so no `CardRewardEvent` is ever produced outside a win.
 */
export function useCardDropReward(
  result: ConsolidatedDuelResult,
  grantReward?: GrantCardDropForResult,
): CardDropRewardViewState {
  const [state, setState] = useState<CardDropRewardViewState>(
    result.status === "victory" ? { status: "loading" } : { status: "not_applicable" },
  );

  useEffect(() => {
    if (result.status !== "victory") {
      setState({ status: "not_applicable" });
      return;
    }
    if (!grantReward) {
      setState({ status: "unavailable", error: NO_GRANT_FUNCTION_ERROR });
      return;
    }

    let active = true;
    setState({ status: "loading" });
    void grantReward(result)
      .then((granted) => {
        if (!active) return;
        setState(
          granted.ok
            ? { status: "granted", granted: granted.value }
            : { status: "unavailable", error: granted.error },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "unavailable",
          error:
            error instanceof DomainError
              ? error
              : new DomainError(
                  "Unexpected error while granting the card drop.",
                  "reward_apply_unavailable",
                ),
        });
      });
    return () => {
      active = false;
    };
  }, [result, grantReward]);

  return state;
}
