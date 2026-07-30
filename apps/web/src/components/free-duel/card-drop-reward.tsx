import { cardArtUrl } from "../../lib/card-art-url.ts";
import type { VictoryRewardViewState } from "../../hooks/use-victory-reward.ts";

export const CARD_DROP_ADDED_MESSAGE = "Adicionada à sua coleção.";
export const CARD_DROP_OFFLINE_MESSAGE = "Carta conquistada salva localmente; sincronizando…";
export const CARD_DROP_ALREADY_APPLIED_MESSAGE = "Recompensa já recebida.";
export const CARD_DROP_PENDING_MESSAGE =
  "Não foi possível conceder sua recompensa agora. Sua vitória foi registrada; tente novamente mais tarde.";

/**
 * Reveals the card granted for a victory (spec free-duel/F06 §3, step 15):
 * art (the same `cards-data/{numero}.jpg` convention as the Library) and the
 * resolved tier, plus the confirmation/degraded message for each
 * `RewardResult` status. `already_applied` shows only the message — the card
 * was already granted in an earlier attempt, so its art is not repeated.
 */
export function CardDropReward({ state }: { readonly state: VictoryRewardViewState }) {
  if (state.status === "not_applicable") return null;
  if (state.status === "loading") return <p aria-busy="true">Selecionando recompensa…</p>;
  if (state.status === "unavailable") return <p role="alert">{CARD_DROP_PENDING_MESSAGE}</p>;

  const { granted } = state;
  if (granted.reward.status === "already_applied") {
    return <p>{CARD_DROP_ALREADY_APPLIED_MESSAGE}</p>;
  }

  return (
    <section aria-label="Carta conquistada">
      <img
        src={cardArtUrl(granted.outcome.cardNumber)}
        alt={`Carta ${granted.outcome.cardNumber}`}
        loading="lazy"
      />
      <p>Faixa: {granted.outcome.tier}</p>
      <p>
        {granted.reward.status === "applied_offline"
          ? CARD_DROP_OFFLINE_MESSAGE
          : CARD_DROP_ADDED_MESSAGE}
      </p>
    </section>
  );
}
