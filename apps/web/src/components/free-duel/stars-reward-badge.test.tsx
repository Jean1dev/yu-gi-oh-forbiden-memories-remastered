// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  STARS_REWARD_ALREADY_APPLIED_MESSAGE,
  STARS_REWARD_OFFLINE_MESSAGE,
  StarsRewardBadge,
} from "./stars-reward-badge.tsx";

const outcome = { cardNumber: "001" as const, source: "duelist_pool" as const, tier: "common" };

describe("StarsRewardBadge", () => {
  it("renders the granted amount and updated wallet", () => {
    render(
      <StarsRewardBadge
        stars={4}
        state={{
          status: "granted",
          granted: { outcome, reward: { status: "applied", cardQuantity: 1, walletStars: 14 } },
        }}
      />,
    );
    expect(screen.getByText("+4 estrelas")).toBeTruthy();
    expect(screen.getByText("Saldo: 14 estrelas")).toBeTruthy();
  });

  it("renders offline and already-credited branches", () => {
    const { rerender } = render(
      <StarsRewardBadge
        stars={4}
        state={{
          status: "granted",
          granted: {
            outcome,
            reward: { status: "applied_offline", localCardQuantity: 1, localWalletStars: 4 },
          },
        }}
      />,
    );
    expect(screen.getByText(STARS_REWARD_OFFLINE_MESSAGE)).toBeTruthy();
    rerender(
      <StarsRewardBadge
        stars={4}
        state={{ status: "granted", granted: { outcome, reward: { status: "already_applied" } } }}
      />,
    );
    expect(screen.getByText(STARS_REWARD_ALREADY_APPLIED_MESSAGE)).toBeTruthy();
    expect(screen.queryByText("+4 estrelas")).toBeNull();
  });
});
