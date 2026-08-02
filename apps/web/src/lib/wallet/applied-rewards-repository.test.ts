import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseAppliedRewardsRepository } from "./applied-rewards-repository.ts";

function clientWithResult(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return { client: { from: vi.fn(() => query) } as unknown as SupabaseClient, query };
}

describe("createSupabaseAppliedRewardsRepository", () => {
  it("listApplied returns only the duel ids present in reward_ledger", async () => {
    const { client, query } = clientWithResult({ data: [{ duel_id: "duel-2" }], error: null });
    const result = await createSupabaseAppliedRewardsRepository(client).listApplied("player", ["duel-1", "duel-2"]);

    expect(result.ok && [...result.value]).toEqual(["duel-2"]);
    expect(query.in).toHaveBeenCalledWith("duel_id", ["duel-1", "duel-2"]);
  });

  it("listApplied returns an empty set for an empty input without calling the database", async () => {
    const from = vi.fn();
    const result = await createSupabaseAppliedRewardsRepository({ from } as unknown as SupabaseClient).listApplied(
      "player",
      [],
    );

    expect(result.ok && result.value.size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it("listApplied returns an error when the reward_ledger read fails", async () => {
    const { client } = clientWithResult({ data: null, error: { message: "offline" } });
    const result = await createSupabaseAppliedRewardsRepository(client).listApplied("player", ["duel-1"]);

    expect(result.ok).toBe(false);
  });
});
