import type { ConsolidatedDuelResult } from "@yugioh/shared";

import {
  getDuelResultReasonMessage,
  getDuelResultTitle,
  RATING_FALLBACK_MESSAGE,
} from "../../lib/free-duel/duel-result-messages.ts";
import type { VictoryRewardViewState } from "../../hooks/use-victory-reward.ts";
import { CardDropReward } from "./card-drop-reward.tsx";
import { StarsRewardBadge } from "./stars-reward-badge.tsx";

export function DuelResult({
  result,
  victoryRewardState = { status: "not_applicable" },
}: {
  readonly result: ConsolidatedDuelResult;
  readonly victoryRewardState?: VictoryRewardViewState;
}) {
  return (
    <section aria-labelledby="duel-result-title" role="status">
      <h2 id="duel-result-title">{getDuelResultTitle(result)}</h2>
      <p>{getDuelResultReasonMessage(result)}</p>
      {result.status === "victory" ? (
        <>
          {result.rating.source === "minimum_fallback" ? (
            <p role="alert">{RATING_FALLBACK_MESSAGE}</p>
          ) : (
            <p>Nota {result.rating.grade}</p>
          )}
          {victoryRewardState.status === "not_applicable" ? (
            <p>+{result.rating.reward.stars} estrelas</p>
          ) : null}
          <CardDropReward state={victoryRewardState} />
          <StarsRewardBadge
            state={victoryRewardState}
            stars={result.rating.reward.stars}
          />
        </>
      ) : null}
    </section>
  );
}
