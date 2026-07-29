// @vitest-environment jsdom
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseClient } from "../lib/supabase/client.ts";
import { useSession } from "./use-session.ts";

vi.mock("../lib/supabase/client.ts", () => ({
  createSupabaseClient: vi.fn(),
}));

const mockedCreateSupabaseClient = vi.mocked(createSupabaseClient);

function fakeClient(getUserResult: { data: { user: unknown }; error: unknown }): SupabaseClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(getUserResult),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  } as unknown as SupabaseClient;
}

describe("useSession", () => {
  it("reports signed-out when there is no user", async () => {
    mockedCreateSupabaseClient.mockReturnValue(fakeClient({ data: { user: null }, error: null }));

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current).toEqual({ status: "signed-out" }));
  });

  it("reports guest for a real Supabase anonymous session", async () => {
    mockedCreateSupabaseClient.mockReturnValue(
      fakeClient({ data: { user: { id: "guest-1", is_anonymous: true, email: undefined } }, error: null }),
    );

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current).toEqual({ status: "guest", playerId: "guest-1" }));
  });

  it("reports authenticated for a permanent user", async () => {
    mockedCreateSupabaseClient.mockReturnValue(
      fakeClient({
        data: { user: { id: "player-1", is_anonymous: false, email: "player@example.com" } },
        error: null,
      }),
    );

    const { result } = renderHook(() => useSession());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "authenticated",
        playerId: "player-1",
        email: "player@example.com",
      }),
    );
  });

  it("reports misconfigured when Supabase is not configured", () => {
    mockedCreateSupabaseClient.mockImplementation(() => {
      throw new Error("Missing Supabase configuration");
    });

    const { result } = renderHook(() => useSession());

    expect(result.current).toEqual({ status: "misconfigured" });
  });
});
