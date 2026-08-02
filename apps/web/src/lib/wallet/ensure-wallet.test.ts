import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSupabaseEnsureWalletRepository } from "./ensure-wallet.ts";

describe("createSupabaseEnsureWalletRepository", () => {
  it("returns createdNow true when the rpc inserts the row", async () => {
    const client = {
      rpc: async () => ({ data: [{ stars: 0, created_now: true }], error: null }),
    } as unknown as SupabaseClient;
    expect(await createSupabaseEnsureWalletRepository(client).ensure("player", 0)).toEqual({
      ok: true,
      value: { stars: 0, createdNow: true },
    });
  });

  it("returns createdNow false and the existing balance when the row already exists", async () => {
    const client = {
      rpc: async () => ({ data: [{ stars: 42, created_now: false }], error: null }),
    } as unknown as SupabaseClient;
    expect(await createSupabaseEnsureWalletRepository(client).ensure("player", 0)).toEqual({
      ok: true,
      value: { stars: 42, createdNow: false },
    });
  });

  it("returns wallet_bootstrap_failed when the rpc errors", async () => {
    const client = {
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    } as unknown as SupabaseClient;
    const result = await createSupabaseEnsureWalletRepository(client).ensure("player", 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("wallet_bootstrap_failed");
  });

  it("returns wallet_bootstrap_failed when the rpc response fails validation", async () => {
    const client = {
      rpc: async () => ({ data: [{ stars: "not-a-number", created_now: true }], error: null }),
    } as unknown as SupabaseClient;
    const result = await createSupabaseEnsureWalletRepository(client).ensure("player", 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("wallet_bootstrap_failed");
  });
});
