// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useVictoryRewardSync } from "./use-victory-reward-sync.ts";

const { getAuthenticatedPlayerId, syncVictoryRewardQueue } = vi.hoisted(() => ({
  getAuthenticatedPlayerId: vi.fn(),
  syncVictoryRewardQueue: vi.fn(),
}));
vi.mock("../lib/supabase/client.ts", () => ({
  createSupabaseClient: () => ({}),
  getAuthenticatedPlayerId,
}));
vi.mock("../lib/reward/sync-victory-reward-queue.ts", () => ({ syncVictoryRewardQueue }));
vi.mock("../lib/reward/victory-reward-repository.ts", () => ({
  createSupabaseVictoryRewardRepository: () => ({}),
}));
vi.mock("../lib/reward/victory-reward-queue.ts", () => ({
  createIndexedDbVictoryRewardQueue: () => ({}),
}));

describe("useVictoryRewardSync", () => {
  it("does not run the sync when there is no authenticated session", async () => {
    getAuthenticatedPlayerId.mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useVictoryRewardSync(() => undefined));
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(getAuthenticatedPlayerId).toHaveBeenCalled());
    expect(syncVictoryRewardQueue).not.toHaveBeenCalled();
    unmount();
  });
});
