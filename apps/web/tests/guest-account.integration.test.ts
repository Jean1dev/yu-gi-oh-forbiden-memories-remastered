import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { onAccountCreated } from "../src/lib/initial-deck/on-account-created.ts";

/**
 * Requires a Supabase instance (local via `supabase start`, or a real
 * project) with `enable_anonymous_sign_ins = true` (`supabase/config.toml`)
 * and every migration under `supabase/migrations/` applied, plus
 * `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` in the
 * environment — the same three `initial-deck.integration.test.ts` reads.
 * Skips cleanly whenever those three aren't set.
 *
 * Confirmed empirically against the local stack (2026-07-29), the answer to
 * the one open question in this feature's plan: with `enable_manual_linking
 * = false` and `double_confirm_changes = true` but no prior e-mail to
 * confirm, `auth.updateUser({ email, password })` on an anonymous session
 * flips `is_anonymous` to `false` **immediately** — no confirmation e-mail
 * step, `auth.uid()` unchanged. The tests below assert that behavior rather
 * than merely documenting it, so a future change to these auth settings that
 * breaks the assumption fails loudly here instead of silently in the UI.
 */
const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON_KEY = process.env["SUPABASE_ANON_KEY"];
const hasSupabaseEnv = SUPABASE_URL !== undefined && SERVICE_ROLE_KEY !== undefined && ANON_KEY !== undefined;

async function cleanupPlayer(admin: SupabaseClient, playerId: string): Promise<void> {
  await admin.from("active_decks").delete().eq("player_id", playerId);
  await admin.from("collections").delete().eq("player_id", playerId);
  await admin.auth.admin.deleteUser(playerId);
}

describe.skipIf(!hasSupabaseEnv)("guest entry + e-mail linking against a real Supabase instance", () => {
  const url = SUPABASE_URL as string;
  const serviceRoleKey = SERVICE_ROLE_KEY as string;
  const anonKey = ANON_KEY as string;

  let admin: SupabaseClient;

  beforeAll(() => {
    admin = createClient(url, serviceRoleKey);
  });

  it("signInAnonymously issues a real session with is_anonymous true", async () => {
    const guest = createClient(url, anonKey);
    const { data, error } = await guest.auth.signInAnonymously();
    expect(error).toBeNull();
    expect(data.user?.is_anonymous).toBe(true);
    expect(data.session).not.toBeNull();

    if (data.user) {
      await cleanupPlayer(admin, data.user.id);
    }
  });

  it("onAccountCreated seeds a 40-card deck for a guest exactly like a permanent user", async () => {
    const guest = createClient(url, anonKey);
    const { data } = await guest.auth.signInAnonymously();
    if (!data.user) throw new Error("expected an anonymous user");
    const playerId = data.user.id;

    try {
      const result = await onAccountCreated(playerId);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.createdNow).toBe(true);
      const total = [...result.value.deck.values()].reduce((sum, quantity) => sum + quantity, 0);
      expect(total).toBe(40);
    } finally {
      await cleanupPlayer(admin, playerId);
    }
  });

  it("updateUser promotes a guest to a permanent account without changing auth.uid(), preserving RLS access to their rows", async () => {
    const guest = createClient(url, anonKey);
    const { data: signedIn } = await guest.auth.signInAnonymously();
    if (!signedIn.user) throw new Error("expected an anonymous user");
    const playerId = signedIn.user.id;

    try {
      await onAccountCreated(playerId);

      const email = `${randomUUID()}@example.com`;
      const { data: updated, error } = await guest.auth.updateUser({
        email,
        password: randomUUID(),
      });

      expect(error).toBeNull();
      expect(updated.user?.id).toBe(playerId);
      expect(updated.user?.is_anonymous).toBe(false);
      expect(updated.user?.email).toBe(email);

      const { data: deckRows, error: deckError } = await guest
        .from("active_decks")
        .select("player_id")
        .eq("player_id", playerId);
      expect(deckError).toBeNull();
      expect(deckRows).toHaveLength(1);

      const { data: collectionRows, error: collectionError } = await guest
        .from("collections")
        .select("numero,quantity")
        .eq("player_id", playerId);
      expect(collectionError).toBeNull();
      const total = (collectionRows ?? []).reduce((sum, row) => sum + row.quantity, 0);
      expect(total).toBe(40);
    } finally {
      await cleanupPlayer(admin, playerId);
    }
  });
});
