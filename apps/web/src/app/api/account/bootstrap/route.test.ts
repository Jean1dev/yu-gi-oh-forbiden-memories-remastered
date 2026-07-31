import { ok } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/initial-deck/on-account-created.ts", () => ({
  onAccountCreated: vi.fn(),
}));
vi.mock("../../../../lib/supabase/client.ts", () => ({
  createSupabaseClient: vi.fn(),
}));

import { onAccountCreated } from "../../../../lib/initial-deck/on-account-created.ts";
import { createSupabaseClient } from "../../../../lib/supabase/client.ts";
import { POST } from "./route.ts";

function requestWithToken(token: string | undefined): Request {
  const headers = new Headers();
  if (token !== undefined) headers.set("authorization", `Bearer ${token}`);
  return new Request("http://localhost/api/account/bootstrap", { method: "POST", headers });
}

describe("POST /api/account/bootstrap", () => {
  it("responds with createdNow and walletCreatedNow on success", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "player-1" } }, error: null }) },
    } as never);
    vi.mocked(onAccountCreated).mockResolvedValue(
      ok({
        initialDeck: { deck: new Map(), createdNow: true },
        wallet: { stars: 0, createdNow: true },
      }),
    );

    const response = await POST(requestWithToken("token"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ createdNow: true, walletCreatedNow: true });
  });

  it("responds with 401 when the bearer token is missing", async () => {
    const response = await POST(requestWithToken(undefined));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "missing_bearer_token" });
  });
});
