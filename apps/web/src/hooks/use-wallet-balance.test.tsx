// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { ok } from "@yugioh/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadWalletBalance } = vi.hoisted(() => ({ loadWalletBalance: vi.fn() }));
vi.mock("../lib/supabase/client.ts", () => ({ createSupabaseClient: vi.fn(() => ({})), getAuthenticatedPlayerId: vi.fn(async () => "player-1") }));
vi.mock("../lib/wallet/load-wallet.ts", () => ({ loadWalletBalance }));
vi.mock("../lib/wallet/indexeddb-cache.ts", () => ({ createIndexedDbWalletCache: vi.fn(() => ({})) }));
vi.mock("../lib/wallet/supabase-repository.ts", () => ({ createSupabaseWalletRepository: vi.fn(() => ({})) }));
vi.mock("../lib/wallet/applied-rewards-repository.ts", () => ({ createSupabaseAppliedRewardsRepository: vi.fn(() => ({})) }));
vi.mock("../lib/reward/victory-reward-queue.ts", () => ({ createIndexedDbVictoryRewardQueue: vi.fn(() => ({})) }));

import { useWalletStore } from "../stores/wallet-store.ts";
import { useWalletBalance } from "./use-wallet-balance.ts";

describe("useWalletBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWalletStore.setState({ state: { status: "idle" } });
  });

  it("triggers the load exactly once across two mounted consumers", async () => {
    loadWalletBalance.mockResolvedValue(ok({
      origin: "server", stars: 4, effectiveStars: 4, pendingStars: 0,
      pendingDuelIds: [], syncedAt: "2026-07-31T00:00:00.000Z",
    }));

    const first = renderHook(() => useWalletBalance());
    const second = renderHook(() => useWalletBalance());
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    expect(second.result.current.status).toBe("ready");
    expect(loadWalletBalance).toHaveBeenCalledTimes(1);
  });
});
