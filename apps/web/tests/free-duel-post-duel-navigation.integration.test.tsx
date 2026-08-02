// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type {
  ConsolidatedDuelResult,
  DuelState,
  Duelist,
  ReadyDeck,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import {
  DuelScreen,
  type DuelScreenContext,
} from "../src/app/free-duel/[duelistId]/duel/duel-screen.tsx";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const field = {
  monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
};
const finalState: DuelState = {
  players: {
    P1: { lp: 8000, hand: [], deck: [], field, handPlayUsed: false },
    P2: { lp: 0, hand: [], deck: [], field, handPlayUsed: false },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 1,
  phase: "end",
  seed: 1,
};
const duelist: Duelist = {
  id: "seto",
  name: "Seto",
  portrait: "/seto.png",
  difficulty: "hard",
  profile: { strategy: "aggressive", parameters: {} },
  deck: [],
  dropPool: [],
};
const playerDeck: ReadyDeck = { composition: {}, cardNumbers: [], total: 40 };
const context: DuelScreenContext = { duelist, playerDeck };

const results: readonly ConsolidatedDuelResult[] = [
  {
    status: "victory",
    duelSessionId: "session-1",
    reason: "lp_depleted",
    rating: {
      source: "rating_engine",
      grade: "A",
      reward: { stars: 10, dropTier: "common" },
    },
  },
  { status: "defeat", duelSessionId: "session-1", reason: "deck_out" },
  { status: "draw", duelSessionId: "session-1", reason: "draw" },
  { status: "unavailable", duelSessionId: "session-1", reason: "missing_outcome" },
];

describe("free duel post-duel navigation integration", () => {
  it.each(results)("renders result and all actions for $status", async (result) => {
    const { unmount } = render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => ({
          status: "ended",
          duelSessionId: "session-1",
          duelistId: "seto",
          finalState,
        })}
        resolveResult={async () => result}
      />,
    );

    expect(await screen.findByRole("navigation", { name: "Ações pós-duelo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Revanche" }).getAttribute("href")).toBe(
      "/free-duel/seto/prepare",
    );
    expect(screen.getByRole("link", { name: "Trocar oponente" }).getAttribute("href")).toBe(
      "/free-duel",
    );
    expect(screen.getByRole("link", { name: "Voltar ao menu" }).getAttribute("href")).toBe("/");
    expect(
      await screen.findByRole("heading", {
        name:
          result.status === "victory"
            ? "Vitória!"
            : result.status === "defeat"
              ? "Derrota"
              : result.status === "draw"
                ? "Empate"
                : "Resultado indisponível",
      }),
    ).toBeTruthy();
    unmount();
  });
});
