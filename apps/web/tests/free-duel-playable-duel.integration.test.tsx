// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getSealedCatalog, listAllCards } from "../src/lib/catalog/sealed-catalog.ts";
import { buildReadyDeck, groupIntoComposition } from "@yugioh/rules";
import type { Card, Duelist, ReadyDeck } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { DuelScreen } from "../src/app/free-duel/[duelistId]/duel/duel-screen.tsx";
import { createDuelRuntime } from "../src/lib/free-duel/duel-runtime.ts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

function buildDeck(cards: readonly Card[]): ReadyDeck {
  const monsters = cards
    .filter((card) => (card.tipo === "monstro" || card.tipo === "ritual") && (card.atk ?? 0) > 0)
    .slice(0, 34);
  const support = cards
    .filter((card) => card.tipo !== "monstro" && card.tipo !== "ritual")
    .slice(0, 6);
  const numbers = [...monsters, ...support].map((card) => card.numero);
  const ready = buildReadyDeck({
    composition: groupIntoComposition(numbers),
    catalog: (cardNumber) => cards.find((card) => card.numero === cardNumber),
  });
  if (!ready.ok) throw new Error(`Expected test deck to be valid: ${ready.error.code}`);
  return ready.value;
}

async function clickPassPhaseWhenEnabled() {
  const before = duelStatus();
  const passPhase = await waitFor(() => {
    const button = screen.getByRole("button", { name: "Passar Fase" });
    if (button.hasAttribute("disabled")) throw new Error("Pass phase is disabled.");
    return button;
  });
  fireEvent.click(passPhase);
  await waitFor(() => expect(duelStatus()).not.toBe(before));
}

function duelStatus(): string {
  return [
    screen.queryByText(/^Fase:/)?.textContent ?? "Fase: desconhecida",
    screen.queryByText(/^Turno:/)?.textContent ?? "Turno: desconhecido",
  ].join(" ");
}

async function reachEnabledAttackSlot() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const attack = screen.queryByRole("button", { name: "Atacar" });
    if (attack && !attack.hasAttribute("disabled")) return;
    await clickPassPhaseWhenEnabled();
  }
  throw new Error(`Attack slot did not become available at ${duelStatus()}.`);
}

describe("free duel playable screen with real engine", () => {
  it("summons, attacks, surrenders, and shows post-duel actions", async () => {
    const catalog = await getSealedCatalog();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;

    const cards = listAllCards(catalog.value);
    const deck = buildDeck(cards);
    const duelist: Duelist = {
      id: "test-duelist",
      name: "Duelista de Teste",
      portrait: "cards-data/001.jpg",
      difficulty: "easy",
      profile: { strategy: "passive", parameters: {} },
      deck: deck.cardNumbers,
      dropPool: [{ tier: "common", cardNumbers: deck.cardNumbers.slice(0, 8) }],
    };
    const runtime = createDuelRuntime({ cards, sleep: async () => undefined });

    render(
      <DuelScreen
        duelistId={duelist.id}
        catalogResult={{ status: "ready", cards }}
        loadContext={async () => ({ duelist, playerDeck: deck })}
        createRuntime={() => runtime}
        autoAdvanceDelayMs={0}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Duelo" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Fase: Principal")).toBeTruthy());

    const hand = within(screen.getByLabelText("Mao do jogador"));
    const handButtons = hand.getAllByRole("button");
    let chosenName: string | null = null;
    for (const button of handButtons) {
      const cardName = button.getAttribute("aria-label");
      if (!cardName) continue;
      fireEvent.click(button);
      const summon = screen.getByRole("button", { name: "Invocar" });
      if (!summon.hasAttribute("disabled")) {
        chosenName = cardName;
        break;
      }
    }
    expect(chosenName).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Invocar" }));
    fireEvent.click(screen.getByRole("button", { name: "Ataque" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `Zona de monstro Jogador 1, ${chosenName}` })).toBeTruthy(),
    );

    await reachEnabledAttackSlot();
    const beforeLp = Number(screen.getByLabelText("Oponente pontos de vida").textContent?.match(/\d+/)?.[0]);
    fireEvent.click(screen.getByRole("button", { name: "Atacar" }));
    fireEvent.click(screen.getByRole("button", { name: `Zona de monstro Jogador 1, ${chosenName}` }));
    fireEvent.click(screen.getByRole("button", { name: "Ataque Direto" }));
    await waitFor(() => {
      const afterLp = Number(screen.getByLabelText("Oponente pontos de vida").textContent?.match(/\d+/)?.[0]);
      expect(afterLp).toBeLessThan(beforeLp);
    });

    fireEvent.click(screen.getByRole("button", { name: "Render-se" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("heading", { name: "Derrota" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Revanche" }).getAttribute("href")).toBe(
      "/free-duel/test-duelist/prepare",
    );
    expect(screen.getByRole("link", { name: "Trocar oponente" }).getAttribute("href")).toBe("/free-duel");
    expect(screen.getByRole("link", { name: "Voltar ao menu" }).getAttribute("href")).toBe("/");
  });
});
