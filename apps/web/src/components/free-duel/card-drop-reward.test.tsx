// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { DomainError } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import type { CardDropRewardViewState } from "../../hooks/use-card-drop-reward.ts";
import {
  CARD_DROP_ALREADY_APPLIED_MESSAGE,
  CARD_DROP_OFFLINE_MESSAGE,
  CARD_DROP_PENDING_MESSAGE,
  CardDropReward,
} from "./card-drop-reward.tsx";

describe("CardDropReward", () => {
  it("renders the granted card art, name and tier", () => {
    const state: CardDropRewardViewState = {
      status: "granted",
      granted: {
        outcome: { cardNumber: "045", source: "duelist_pool", tier: "rare" },
        reward: { status: "applied", currentQuantity: 1 },
      },
    };
    render(<CardDropReward state={state} />);

    const art = screen.getByRole("img", { name: "Carta 045" });
    expect(art.getAttribute("src")).toBe("/cards-data/045.jpg");
    expect(screen.getByText("Faixa: rare")).toBeTruthy();
  });

  it("renders the offline-sync message when reward status is applied_offline", () => {
    const state: CardDropRewardViewState = {
      status: "granted",
      granted: {
        outcome: { cardNumber: "045", source: "duelist_pool", tier: "rare" },
        reward: { status: "applied_offline", localQuantity: 1 },
      },
    };
    render(<CardDropReward state={state} />);

    expect(screen.getByText(CARD_DROP_OFFLINE_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Carta 045" })).toBeTruthy();
  });

  it("renders the already-applied message without duplicating the card", () => {
    const state: CardDropRewardViewState = {
      status: "granted",
      granted: {
        outcome: { cardNumber: "045", source: "duelist_pool", tier: "rare" },
        reward: { status: "already_applied", currentQuantity: 1 },
      },
    };
    render(<CardDropReward state={state} />);

    expect(screen.getByText(CARD_DROP_ALREADY_APPLIED_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the reward-pending message when selection fails", () => {
    const state: CardDropRewardViewState = {
      status: "unavailable",
      error: new DomainError("no candidates", "no_drop_candidates_available"),
    };
    render(<CardDropReward state={state} />);

    expect(screen.getByRole("alert").textContent).toBe(CARD_DROP_PENDING_MESSAGE);
  });
});
