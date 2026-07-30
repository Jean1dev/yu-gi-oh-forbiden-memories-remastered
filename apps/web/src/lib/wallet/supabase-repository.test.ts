import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSupabaseWalletRepository } from "./supabase-repository.ts";

describe("createSupabaseWalletRepository", () => {
  it("validates and translates a wallet row", async () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: { player_id: "player", stars: 8 }, error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    expect(await createSupabaseWalletRepository(client).load("player")).toEqual({
      ok: true,
      value: { playerId: "player", stars: 8 },
    });
  });
});
