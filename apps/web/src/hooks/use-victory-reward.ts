"use client";

import {
  DomainError,
  type ConsolidatedDuelResult,
  type Result,
} from "@yugioh/shared";
import { useEffect, useState } from "react";

import type { GrantedVictoryReward } from "../lib/free-duel/grant-victory-reward.ts";

export type GrantVictoryRewardForResult = (
  result: Extract<ConsolidatedDuelResult, { status: "victory" }>,
) => Promise<Result<GrantedVictoryReward, DomainError>>;

export type VictoryRewardViewState =
  | Readonly<{ status: "not_applicable" }>
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "granted"; granted: GrantedVictoryReward }>
  | Readonly<{ status: "unavailable"; error: DomainError }>;

export function useVictoryReward(
  result: ConsolidatedDuelResult,
  grantReward?: GrantVictoryRewardForResult,
): VictoryRewardViewState {
  const [state, setState] = useState<VictoryRewardViewState>(
    result.status === "victory" ? { status: "loading" } : { status: "not_applicable" },
  );
  useEffect(() => {
    if (result.status !== "victory") {
      setState({ status: "not_applicable" });
      return;
    }
    if (grantReward === undefined) {
      setState({
        status: "unavailable",
        error: new DomainError("Victory reward is not configured.", "victory_reward_apply_unavailable"),
      });
      return;
    }
    let active = true;
    void grantReward(result)
      .then((response) => {
        if (active) {
          setState(
            response.ok
              ? { status: "granted", granted: response.value }
              : { status: "unavailable", error: response.error },
          );
        }
      })
      .catch(() => {
        if (active) {
          setState({
            status: "unavailable",
            error: new DomainError("Victory reward failed.", "victory_reward_apply_unavailable"),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [grantReward, result]);
  return state;
}
