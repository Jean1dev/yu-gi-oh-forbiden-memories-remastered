import type { ConsolidatedDuelResult } from "@yugioh/shared";

import {
  getDuelResultReasonMessage,
  getDuelResultTitle,
  RATING_FALLBACK_MESSAGE,
} from "../../lib/free-duel/duel-result-messages.ts";

export function DuelResult({ result }: { readonly result: ConsolidatedDuelResult }) {
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
          <p>+{result.rating.reward.stars} estrelas</p>
        </>
      ) : null}
    </section>
  );
}

