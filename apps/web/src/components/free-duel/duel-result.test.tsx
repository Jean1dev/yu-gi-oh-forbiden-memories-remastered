// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { ConsolidatedDuelResult } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { RATING_FALLBACK_MESSAGE } from "../../lib/free-duel/duel-result-messages.ts";
import { DuelResult } from "./duel-result.tsx";

describe("DuelResult", () => {
  it.each([
    {
      result: {
        status: "defeat",
        duelSessionId: "duel-1",
        reason: "lp_depleted",
      } satisfies ConsolidatedDuelResult,
      title: "Derrota",
      reason: "Seus LP chegaram a 0.",
    },
    {
      result: {
        status: "draw",
        duelSessionId: "duel-1",
        reason: "draw",
      } satisfies ConsolidatedDuelResult,
      title: "Empate",
      reason: "O duelo terminou empatado.",
    },
    {
      result: {
        status: "unavailable",
        duelSessionId: "duel-1",
        reason: "missing_outcome",
      } satisfies ConsolidatedDuelResult,
      title: "Resultado indisponível",
      reason: "Não foi possível apurar o resultado do duelo.",
    },
  ])("renders $title without reward", ({ result, title, reason }) => {
    render(<DuelResult result={result} />);
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
    expect(screen.queryByText(/^Nota /)).toBeNull();
  });

  it("renders an official opaque grade and stars on victory", () => {
    render(
      <DuelResult
        result={{
          status: "victory",
          duelSessionId: "duel-1",
          reason: "deck_out",
          rating: {
            source: "rating_engine",
            grade: "opaque-grade",
            reward: { stars: 31, dropTier: "opaque-tier" },
          },
        }}
        victoryRewardState={{
          status: "granted",
          granted: {
            outcome: { cardNumber: "001", source: "duelist_pool", tier: "opaque-tier" },
            reward: { status: "applied", cardQuantity: 1, walletStars: 31 },
          },
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Vitória!" })).toBeTruthy();
    expect(screen.getByText("Nota opaque-grade")).toBeTruthy();
    expect(screen.getByText("+31 estrelas")).toBeTruthy();
  });

  it("renders the exact fallback notice and configured minimum reward", () => {
    render(
      <DuelResult
        result={{
          status: "victory",
          duelSessionId: "duel-1",
          reason: "lp_depleted",
          rating: {
            source: "minimum_fallback",
            grade: null,
            reward: { stars: 9, dropTier: "configured-tier" },
          },
        }}
        victoryRewardState={{
          status: "granted",
          granted: {
            outcome: { cardNumber: "001", source: "duelist_pool", tier: "configured-tier" },
            reward: { status: "applied", cardQuantity: 1, walletStars: 9 },
          },
        }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe(RATING_FALLBACK_MESSAGE);
    expect(screen.getByText("+9 estrelas")).toBeTruthy();
    expect(screen.queryByText(/^Nota /)).toBeNull();
  });

  it("renders CardDropReward only in the victory branch", () => {
    render(
      <DuelResult
        result={{
          status: "victory",
          duelSessionId: "duel-1",
          reason: "deck_out",
          rating: {
            source: "rating_engine",
            grade: "A",
            reward: { stars: 10, dropTier: "common" },
          },
        }}
        victoryRewardState={{
          status: "granted",
          granted: {
            outcome: { cardNumber: "001", source: "duelist_pool", tier: "common" },
            reward: { status: "applied", cardQuantity: 1, walletStars: 10 },
          },
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Carta 001" })).toBeTruthy();
  });

  it("does not render CardDropReward in the defeat or draw branch", () => {
    const { rerender } = render(
      <DuelResult
        result={{ status: "defeat", duelSessionId: "duel-1", reason: "lp_depleted" }}
        victoryRewardState={{
          status: "granted",
          granted: {
            outcome: { cardNumber: "001", source: "duelist_pool", tier: "common" },
            reward: { status: "applied", cardQuantity: 1, walletStars: 10 },
          },
        }}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();

    rerender(
      <DuelResult
        result={{ status: "draw", duelSessionId: "duel-1", reason: "draw" }}
        victoryRewardState={{
          status: "granted",
          granted: {
            outcome: { cardNumber: "001", source: "duelist_pool", tier: "common" },
            reward: { status: "applied", cardQuantity: 1, walletStars: 10 },
          },
        }}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
  });
});
