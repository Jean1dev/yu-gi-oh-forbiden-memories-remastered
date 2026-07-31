import { DomainError, err, ok } from "@yugioh/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { saveSnapshot, loadWalletBalance } = vi.hoisted(() => ({
  saveSnapshot: vi.fn().mockResolvedValue(undefined),
  loadWalletBalance: vi.fn(),
}));

vi.mock("../lib/supabase/client.ts", () => ({
  createSupabaseClient: vi.fn(() => ({})),
  getAuthenticatedPlayerId: vi.fn(async () => "player-1"),
}));
vi.mock("../lib/wallet/load-wallet.ts", () => ({ loadWalletBalance }));
vi.mock("../lib/wallet/indexeddb-cache.ts", () => ({
  createIndexedDbWalletCache: vi.fn(() => ({ loadSnapshot: vi.fn(), saveSnapshot })),
}));
vi.mock("../lib/wallet/supabase-repository.ts", () => ({ createSupabaseWalletRepository: vi.fn(() => ({})) }));
vi.mock("../lib/wallet/applied-rewards-repository.ts", () => ({ createSupabaseAppliedRewardsRepository: vi.fn(() => ({})) }));
vi.mock("../lib/reward/victory-reward-queue.ts", () => ({ createIndexedDbVictoryRewardQueue: vi.fn(() => ({})) }));

import { useWalletStore } from "./wallet-store.ts";

const loaded = {
  origin: "server" as const,
  stars: 12,
  effectiveStars: 17,
  pendingStars: 5,
  pendingDuelIds: ["duel-1"],
  syncedAt: "2026-07-31T00:00:00.000Z",
};

describe("useWalletStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWalletStore.setState({ state: { status: "idle" } });
  });

  it("transitions idle to loading to ready on a successful load", async () => {
    let finish: ((value: ReturnType<typeof ok<typeof loaded>>) => void) | undefined;
    loadWalletBalance.mockReturnValue(new Promise((resolve) => { finish = resolve; }));

    const loading = useWalletStore.getState().load();
    expect(useWalletStore.getState().state.status).toBe("loading");
    finish?.(ok(loaded));
    await loading;
    expect(useWalletStore.getState().state).toEqual({ status: "ready", loaded });
  });

  it("transitions to unavailable when the load fails", async () => {
    const error = new DomainError("offline", "wallet_unavailable");
    loadWalletBalance.mockResolvedValue(err(error));
    await useWalletStore.getState().load();
    expect(useWalletStore.getState().state).toEqual({ status: "unavailable", error });
  });

  it("setAuthoritativeBalance replaces balances and rewrites the cache snapshot", async () => {
    loadWalletBalance.mockResolvedValue(ok(loaded));
    await useWalletStore.getState().load();
    useWalletStore.getState().setAuthoritativeBalance(8);

    const state = useWalletStore.getState().state;
    expect(state.status === "ready" && state.loaded).toMatchObject({
      origin: "server", stars: 8, effectiveStars: 8, pendingStars: 0, pendingDuelIds: [],
    });
    expect(saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({ playerId: "player-1", stars: 8 }));
  });

  it.each([-1, 1.5])("setAuthoritativeBalance ignores invalid value %s", async (stars) => {
    loadWalletBalance.mockResolvedValue(ok(loaded));
    await useWalletStore.getState().load();
    useWalletStore.getState().setAuthoritativeBalance(stars);
    expect(useWalletStore.getState().state).toEqual({ status: "ready", loaded });
    expect(saveSnapshot).not.toHaveBeenCalled();
  });
});
