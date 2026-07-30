// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import {
  ok,
  type CardCatalogLookup,
  type DropPool,
  type DuelOutcome,
  type DuelSession,
  type DuelState,
  type Duelist,
  type RatingEngine,
  type ReadyDeck,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import {
  DuelScreen,
  type DuelScreenContext,
} from "../src/app/free-duel/[duelistId]/duel/duel-screen.tsx";
import type { CollectionCache } from "../src/lib/collection/indexeddb-cache.ts";
import type { Clock } from "../src/lib/collection/load-collection.ts";
import { createGrantCardDropCache, grantCardDrop } from "../src/lib/free-duel/grant-card-drop.ts";
import {
  createDuelResultCache,
  resolveDuelResult,
} from "../src/lib/free-duel/resolve-duel-result.ts";
import type { RewardQueue } from "../src/lib/reward/offline-queue.ts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const emptyField = {
  monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
};

const endedState: DuelState = {
  players: {
    P1: { lp: 4000, hand: [], deck: [], field: emptyField },
    P2: { lp: 0, hand: [], deck: [], field: emptyField },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 3,
  phase: "end",
  seed: 1,
};

function endedSession(duelSessionId: string): Extract<DuelSession, { status: "ended" }> {
  return { status: "ended", duelSessionId, duelistId: "seto", finalState: endedState };
}

function duelistWithDropPool(dropPool: DropPool): Duelist {
  return {
    id: "seto",
    name: "Seto",
    portrait: "/seto.png",
    difficulty: "hard",
    profile: { strategy: "aggressive", parameters: {} },
    deck: [],
    dropPool,
  };
}

const playerDeck: ReadyDeck = { composition: {}, cardNumbers: [], total: 40 };

function fakeCatalog(knownNumbers: readonly string[]): CardCatalogLookup {
  return (cardNumber) =>
    knownNumbers.includes(cardNumber) ? ({ numero: cardNumber } as never) : undefined;
}

function fakeRewardQueue(): RewardQueue {
  return {
    async enqueueReward() {},
    async listPendingRewards() {
      return [];
    },
    async removePendingReward() {},
  };
}

function fakeCollectionCache(): CollectionCache {
  return {
    async loadSnapshot() {
      return undefined;
    },
    async saveSnapshot() {},
  };
}

const fixedClock: Clock = { now: () => new Date("2026-07-30T12:00:00.000Z") };

function ratingEngineFor(reward: { stars: number; dropTier: string }) {
  return {
    evaluate: vi.fn<RatingEngine["evaluate"]>(async () => ok({ grade: "A", reward })),
  };
}

function resolveResultFor(outcome: DuelOutcome, reward: { stars: number; dropTier: string }) {
  const cache = createDuelResultCache();
  return (session: Extract<DuelSession, { status: "ended" }>) =>
    resolveDuelResult(session, {
      readOutcome: () => ok(outcome),
      createSnapshot: (state) => state,
      ratingEngine: ratingEngineFor(reward),
      minimumReward: { stars: 1, dropTier: "common" },
      cache,
    });
}

describe("free duel F03 to F06 card drop integration", () => {
  it("victory flow grants exactly one card and displays it in the result screen", async () => {
    const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001", "002"] }];
    const context: DuelScreenContext = { duelist: duelistWithDropPool(dropPool), playerDeck };
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));

    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => endedSession("session-victory")}
        resolveResult={resolveResultFor(
          { status: "decisive", winner: "P1", loser: "P2", reason: "lp_zerado" },
          { stars: 10, dropTier: "common" },
        )}
        grantCardDropReward={(result, resolvedDropPool) =>
          grantCardDrop(
            result,
            { playerId: "player-1", dropPool: resolvedDropPool },
            {
              catalog: fakeCatalog(["001", "002"]),
              rewardRepository: { apply },
              rewardQueue: fakeRewardQueue(),
              collectionCache: fakeCollectionCache(),
              applyOfflineReward: vi.fn(),
              clock: fixedClock,
              defaultCommonDropPool: ["099"],
            },
          )
        }
      />,
    );

    expect(await screen.findByRole("heading", { name: "Vitória!" })).toBeTruthy();
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
    const [, , grantedCardNumber] = apply.mock.calls[0] as [string, string, string];
    expect(["001", "002"]).toContain(grantedCardNumber);
    expect(screen.getByRole("img", { name: `Carta ${grantedCardNumber}` })).toBeTruthy();
    expect(screen.getByText("Adicionada à sua coleção.")).toBeTruthy();
  });

  it("defeat flow never calls grantCardDrop or registerCardReward", async () => {
    const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001"] }];
    const context: DuelScreenContext = { duelist: duelistWithDropPool(dropPool), playerDeck };
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const grantCardDropReward = vi.fn((result: never, resolvedDropPool: DropPool) =>
      grantCardDrop(
        result,
        { playerId: "player-1", dropPool: resolvedDropPool },
        {
          catalog: fakeCatalog(["001"]),
          rewardRepository: { apply },
          rewardQueue: fakeRewardQueue(),
          collectionCache: fakeCollectionCache(),
          applyOfflineReward: vi.fn(),
          clock: fixedClock,
          defaultCommonDropPool: ["099"],
        },
      ),
    );

    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => endedSession("session-defeat")}
        resolveResult={resolveResultFor(
          { status: "decisive", winner: "P2", loser: "P1", reason: "lp_zerado" },
          { stars: 10, dropTier: "common" },
        )}
        grantCardDropReward={grantCardDropReward}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Derrota" })).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
    expect(grantCardDropReward).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it("draw flow never calls grantCardDrop or registerCardReward", async () => {
    const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001"] }];
    const context: DuelScreenContext = { duelist: duelistWithDropPool(dropPool), playerDeck };
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const grantCardDropReward = vi.fn((result: never, resolvedDropPool: DropPool) =>
      grantCardDrop(
        result,
        { playerId: "player-1", dropPool: resolvedDropPool },
        {
          catalog: fakeCatalog(["001"]),
          rewardRepository: { apply },
          rewardQueue: fakeRewardQueue(),
          collectionCache: fakeCollectionCache(),
          applyOfflineReward: vi.fn(),
          clock: fixedClock,
          defaultCommonDropPool: ["099"],
        },
      ),
    );

    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => endedSession("session-draw")}
        resolveResult={resolveResultFor(
          { status: "draw", winner: null, loser: null, reason: "empate" },
          { stars: 10, dropTier: "common" },
        )}
        grantCardDropReward={grantCardDropReward}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Empate" })).toBeTruthy();
    expect(grantCardDropReward).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it("empty duelist drop pool falls back to the default common pool and still grants a card", async () => {
    const emptyDropPool: DropPool = [];
    const context: DuelScreenContext = { duelist: duelistWithDropPool(emptyDropPool), playerDeck };
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));

    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => endedSession("session-fallback")}
        resolveResult={resolveResultFor(
          { status: "decisive", winner: "P1", loser: "P2", reason: "lp_zerado" },
          { stars: 10, dropTier: "common" },
        )}
        grantCardDropReward={(result, resolvedDropPool) =>
          grantCardDrop(
            result,
            { playerId: "player-1", dropPool: resolvedDropPool },
            {
              catalog: fakeCatalog(["099"]),
              rewardRepository: { apply },
              rewardQueue: fakeRewardQueue(),
              collectionCache: fakeCollectionCache(),
              applyOfflineReward: vi.fn(),
              clock: fixedClock,
              defaultCommonDropPool: ["099"],
            },
          )
        }
      />,
    );

    await waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
    expect(apply).toHaveBeenCalledWith("player-1", "session-fallback", "099");
    expect(screen.getByRole("img", { name: "Carta 099" })).toBeTruthy();
  });

  it("reopening the result screen for the same session does not duplicate the reward call", async () => {
    const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001"] }];
    const context: DuelScreenContext = { duelist: duelistWithDropPool(dropPool), playerDeck };
    const apply = vi.fn(async () => ok({ applied: true, currentQuantity: 1 }));
    const sharedGrantCache = createGrantCardDropCache();
    const resolveResult = resolveResultFor(
      { status: "decisive", winner: "P1", loser: "P2", reason: "lp_zerado" },
      { stars: 10, dropTier: "common" },
    );
    const grantCardDropReward = (
      result: Parameters<typeof grantCardDrop>[0],
      resolvedDropPool: DropPool,
    ) =>
      grantCardDrop(
        result,
        { playerId: "player-1", dropPool: resolvedDropPool },
        {
          catalog: fakeCatalog(["001"]),
          rewardRepository: { apply },
          rewardQueue: fakeRewardQueue(),
          collectionCache: fakeCollectionCache(),
          applyOfflineReward: vi.fn(),
          clock: fixedClock,
          defaultCommonDropPool: ["099"],
          cache: sharedGrantCache,
        },
      );

    const first = render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => endedSession("session-reopen")}
        resolveResult={resolveResult}
        grantCardDropReward={grantCardDropReward}
      />,
    );
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
    first.unmount();

    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => context}
        startMatch={() => endedSession("session-reopen")}
        resolveResult={resolveResult}
        grantCardDropReward={grantCardDropReward}
      />,
    );
    expect(await screen.findByText("Adicionada à sua coleção.")).toBeTruthy();
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
