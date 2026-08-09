import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSupabaseVictoryRewardRepository } from "./victory-reward-repository.ts";

/**
 * Supabase's `rpc` returns a thenable builder, not a bare promise, so the fake
 * has to carry `abortSignal` for the timeout guard to chain off it.
 */
function clientReturning(response: unknown, abortSignalCalls: { count: number }): SupabaseClient {
  const builder = {
    abortSignal: () => {
      abortSignalCalls.count += 1;
      return Promise.resolve(response);
    },
    then: (resolve: (value: unknown) => unknown) => resolve(response),
  };
  return { rpc: () => builder } as unknown as SupabaseClient;
}

describe("createSupabaseVictoryRewardRepository", () => {
  it("validates and translates the rpc response", async () => {
    const calls = { count: 0 };
    const client = clientReturning(
      { data: [{ applied: true, card_quantity: 2, wallet_stars: 9 }], error: null },
      calls,
    );

    expect(await createSupabaseVictoryRewardRepository(client).apply("p", "d", "001", 4)).toEqual({
      ok: true,
      value: { applied: true, cardQuantity: 2, walletStars: 9 },
    });
  });

  it("bounds the rpc with an abort signal so a hung call reaches the offline path", async () => {
    const calls = { count: 0 };
    const client = clientReturning(
      { data: [{ applied: true, card_quantity: 1, wallet_stars: 1 }], error: null },
      calls,
    );

    await createSupabaseVictoryRewardRepository(client).apply("p", "d", "001", 4);

    expect(calls.count).toBe(1);
  });

  it("returns a domain error when the rpc response fails validation", async () => {
    const calls = { count: 0 };
    const client = clientReturning({ data: [{ applied: "yes" }], error: null }, calls);

    const result = await createSupabaseVictoryRewardRepository(client).apply("p", "d", "001", 4);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("victory_reward_apply_unavailable");
  });
});
