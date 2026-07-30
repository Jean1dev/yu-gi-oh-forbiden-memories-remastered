import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSupabaseVictoryRewardRepository } from "./victory-reward-repository.ts";

describe("createSupabaseVictoryRewardRepository", () => {
  it("validates and translates the rpc response", async () => {
    const client = {
      rpc: async () => ({
        data: [{ applied: true, card_quantity: 2, wallet_stars: 9 }],
        error: null,
      }),
    } as unknown as SupabaseClient;
    expect(await createSupabaseVictoryRewardRepository(client).apply("p", "d", "001", 4)).toEqual({
      ok: true,
      value: { applied: true, cardQuantity: 2, walletStars: 9 },
    });
  });
});
