import type { SupabaseClient } from "@supabase/supabase-js";
import { ok, err, DomainError } from "@yugioh/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { bootstrapAccount } from "./bootstrap-account.ts";
import { continueAsGuest } from "./continue-as-guest.ts";

vi.mock("./bootstrap-account.ts", () => ({
  bootstrapAccount: vi.fn(),
}));

const mockedBootstrapAccount = vi.mocked(bootstrapAccount);

function fakeClient(signInAnonymously: SupabaseClient["auth"]["signInAnonymously"]): SupabaseClient {
  return { auth: { signInAnonymously } } as unknown as SupabaseClient;
}

describe("continueAsGuest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in anonymously and bootstraps the account", async () => {
    const client = fakeClient(
      vi.fn().mockResolvedValue({
        data: { session: { access_token: "guest-token" }, user: { id: "guest-1" } },
        error: null,
      }),
    );
    mockedBootstrapAccount.mockResolvedValue(ok(true));

    const result = await continueAsGuest(client);

    expect(result).toEqual(ok(undefined));
    expect(mockedBootstrapAccount).toHaveBeenCalledWith("guest-token");
  });

  it("fails when the anonymous sign-in itself fails", async () => {
    const client = fakeClient(
      vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: new Error("anonymous sign-ins disabled"),
      }),
    );

    const result = await continueAsGuest(client);

    expect(result.ok).toBe(false);
    expect(mockedBootstrapAccount).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.error.code).toBe("guest_sign_in_failed");
    }
  });

  it("fails when the sign-in succeeds but bootstrap fails", async () => {
    const client = fakeClient(
      vi.fn().mockResolvedValue({
        data: { session: { access_token: "guest-token" }, user: { id: "guest-1" } },
        error: null,
      }),
    );
    mockedBootstrapAccount.mockResolvedValue(err(new DomainError("boom", "bootstrap_failed")));

    const result = await continueAsGuest(client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("guest_bootstrap_failed");
    }
  });
});
