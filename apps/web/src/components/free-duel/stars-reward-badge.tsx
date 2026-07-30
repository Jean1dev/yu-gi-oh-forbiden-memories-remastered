import type { VictoryRewardViewState } from "../../hooks/use-victory-reward.ts";

export const STARS_REWARD_OFFLINE_MESSAGE = "Estrelas creditadas localmente; sincronizando…";
export const STARS_REWARD_ALREADY_APPLIED_MESSAGE = "Estrelas já creditadas.";
export const STARS_REWARD_UNAVAILABLE_MESSAGE =
  "Não foi possível creditar suas estrelas agora. Tente novamente mais tarde.";

export function StarsRewardBadge({
  state,
  stars,
}: {
  readonly state: VictoryRewardViewState;
  readonly stars: number;
}) {
  if (state.status === "not_applicable" || state.status === "loading") return null;
  if (state.status === "unavailable") {
    return <p role="alert">{STARS_REWARD_UNAVAILABLE_MESSAGE}</p>;
  }
  if (state.granted.reward.status === "already_applied") {
    return <p>{STARS_REWARD_ALREADY_APPLIED_MESSAGE}</p>;
  }
  const walletStars =
    state.granted.reward.status === "applied"
      ? state.granted.reward.walletStars
      : state.granted.reward.localWalletStars;
  return (
    <section aria-label="Estrelas conquistadas">
      <p>+{stars} estrelas</p>
      <p>Saldo: {walletStars} estrelas</p>
      {state.granted.reward.status === "applied_offline" ? (
        <p>{STARS_REWARD_OFFLINE_MESSAGE}</p>
      ) : null}
    </section>
  );
}
