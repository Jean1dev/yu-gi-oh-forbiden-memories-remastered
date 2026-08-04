// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { DomainError, type Card } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import type { VictoryRewardViewState } from "../../hooks/use-victory-reward.ts";
import {
  CARD_DROP_ALREADY_APPLIED_MESSAGE,
  CARD_DROP_OFFLINE_MESSAGE,
  CARD_DROP_PENDING_MESSAGE,
  CardDropReward,
} from "./card-drop-reward.tsx";

describe("CardDropReward", () => {
  const migratedCard: Card = {
    id: 45,
    numero: "045",
    nome: "Migrated reward",
    img: null,
    classe: "Dragon",
    atk: 1000,
    def: 1000,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
    atributo: "LIGHT",
    nivel: 4,
    descricao: "Migrated.",
  };

  it("renders the granted card art, name and tier", () => {
    const state: VictoryRewardViewState = {
      status: "granted",
      granted: {
        outcome: { cardNumber: "045", source: "duelist_pool", tier: "rare" },
        reward: { status: "applied", cardQuantity: 1, walletStars: 10 },
      },
    };
    render(<CardDropReward state={state} />);

    const art = screen.getByRole("img", { name: "Carta 045" });
    expect(art.getAttribute("src")).toBe("/cards-data/045.jpg");
    expect(screen.getByText("Faixa: rare")).toBeTruthy();
  });

  it("renders CardFrame for a migrated granted card", () => {
    const state: VictoryRewardViewState = {
      status: "granted",
      granted: {
        outcome: { cardNumber: "045", source: "duelist_pool", tier: "rare" },
        reward: { status: "applied", cardQuantity: 1, walletStars: 10 },
      },
    };

    render(<CardDropReward state={state} card={migratedCard} />);

    expect(screen.getByText("ATK 1000")).toBeTruthy();
    expect(screen.getByText("DEF 1000")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Carta 045" })).toBeNull();
  });

  it("renders the offline-sync message when reward status is applied_offline", () => {
    const state: VictoryRewardViewState = {
      status: "granted",
      granted: {
        outcome: { cardNumber: "045", source: "duelist_pool", tier: "rare" },
        reward: { status: "applied_offline", localCardQuantity: 1, localWalletStars: 10 },
      },
    };
    render(<CardDropReward state={state} />);

    expect(screen.getByText(CARD_DROP_OFFLINE_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Carta 045" })).toBeTruthy();
  });

  it("renders the already-applied message without duplicating the card", () => {
    const state: VictoryRewardViewState = {
      status: "granted",
      granted: {
        outcome: { cardNumber: "045", source: "duelist_pool", tier: "rare" },
        reward: { status: "already_applied", cardQuantity: 1, walletStars: 10 },
      },
    };
    render(<CardDropReward state={state} />);

    expect(screen.getByText(CARD_DROP_ALREADY_APPLIED_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the reward-pending message when selection fails", () => {
    const state: VictoryRewardViewState = {
      status: "unavailable",
      error: new DomainError("no candidates", "no_drop_candidates_available"),
    };
    render(<CardDropReward state={state} />);

    expect(screen.getByRole("alert").textContent).toBe(CARD_DROP_PENDING_MESSAGE);
  });
});
