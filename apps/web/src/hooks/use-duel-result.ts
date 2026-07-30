"use client";

import type {
  ConsolidatedDuelResult,
  EndedDuelSession,
} from "@yugioh/shared";
import { useEffect, useState } from "react";

export type ResolveEndedDuelResult = (
  session: EndedDuelSession,
) => Promise<ConsolidatedDuelResult>;

export type DuelResultViewState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "resolved"; result: ConsolidatedDuelResult }>;

export function useDuelResult(
  session: EndedDuelSession,
  resolveResult?: ResolveEndedDuelResult,
): DuelResultViewState {
  const [state, setState] = useState<DuelResultViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    if (!resolveResult) {
      setState({
        status: "resolved",
        result: {
          status: "unavailable",
          duelSessionId: session.duelSessionId,
          reason: "missing_outcome",
        },
      });
      return () => {
        active = false;
      };
    }
    setState({ status: "loading" });
    void resolveResult(session)
      .then((result) => {
        if (active) setState({ status: "resolved", result });
      })
      .catch(() => {
        if (active) {
          setState({
            status: "resolved",
            result: {
              status: "unavailable",
              duelSessionId: session.duelSessionId,
              reason: "invalid_outcome",
            },
          });
        }
      });
    return () => {
      active = false;
    };
  }, [resolveResult, session]);

  return state;
}

