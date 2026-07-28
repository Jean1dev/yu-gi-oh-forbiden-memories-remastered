// @vitest-environment jsdom
import { ok, err, DomainError, type Collection, type Result } from "@yugioh/shared";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseInitialDeckRepository,
  type InitialDeckRepository,
} from "../lib/initial-deck/supabase-repository.ts";
import { createSupabaseClient, getAuthenticatedPlayerId } from "../lib/supabase/client.ts";
import { useActiveDeck } from "./use-active-deck.ts";

vi.mock("../lib/supabase/client.ts", () => ({
  createSupabaseClient: vi.fn(),
  getAuthenticatedPlayerId: vi.fn(),
}));
vi.mock("../lib/initial-deck/supabase-repository.ts", () => ({
  createSupabaseInitialDeckRepository: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createSupabaseClient);
const mockedGetPlayerId = vi.mocked(getAuthenticatedPlayerId);
const mockedCreateRepository = vi.mocked(createSupabaseInitialDeckRepository);

function mockRepository(
  readExisting: (playerId: string) => Promise<Result<Collection | undefined, DomainError>>,
): void {
  mockedCreateClient.mockReturnValue({} as never);
  const repository: InitialDeckRepository = { readExisting, persist: vi.fn() };
  mockedCreateRepository.mockReturnValue(repository);
}

describe("useActiveDeck", () => {
  it("reports session_missing when there is no authenticated player", async () => {
    mockedGetPlayerId.mockResolvedValue(undefined);
    mockRepository(vi.fn());

    const { result } = renderHook(() => useActiveDeck());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.status === "error" && result.current.error.code).toBe("session_missing");
  });

  it("reports pending when active_decks has no row yet for the player", async () => {
    mockedGetPlayerId.mockResolvedValue("player-1");
    mockRepository(vi.fn().mockResolvedValue(ok(undefined)));

    const { result } = renderHook(() => useActiveDeck());

    await waitFor(() => {
      expect(result.current.status).toBe("pending");
    });
  });

  it("reports ready with the active deck once the read resolves", async () => {
    mockedGetPlayerId.mockResolvedValue("player-1");
    const activeDeck = new Map([["001", 2]]);
    mockRepository(vi.fn().mockResolvedValue(ok(activeDeck)));

    const { result } = renderHook(() => useActiveDeck());

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current.status === "ready" && result.current.activeDeck).toEqual(activeDeck);
  });

  it("reports the error when the read fails", async () => {
    mockedGetPlayerId.mockResolvedValue("player-1");
    mockRepository(vi.fn().mockResolvedValue(err(new DomainError("boom", "initial_deck_unavailable"))));

    const { result } = renderHook(() => useActiveDeck());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.status === "error" && result.current.error.code).toBe("initial_deck_unavailable");
  });
});
