import type { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, err, ok, type Result } from "@yugioh/shared";

import { bootstrapAccount } from "./bootstrap-account.ts";

/**
 * Starts a guest session: a real Supabase anonymous sign-in, then the same
 * bootstrap the email/password flow runs. `auth.uid()` for a guest session is
 * exactly as valid a `player_id` as a permanent user's, so the seeded deck and
 * collection carry over untouched if this player later links an e-mail
 * (`updateUser`, `/login/link-email`) — no separate account is ever created.
 */
export async function continueAsGuest(client: SupabaseClient): Promise<Result<void, DomainError>> {
  const { data, error } = await client.auth.signInAnonymously();
  if (error || data.session === null) {
    return err(
      new DomainError("Could not start a guest session.", "guest_sign_in_failed", {
        cause: error?.message,
      }),
    );
  }

  const bootstrapped = await bootstrapAccount(data.session.access_token);
  if (!bootstrapped.ok) {
    return err(
      new DomainError("Guest session started, but the initial deck could not be prepared.", "guest_bootstrap_failed", {
        cause: bootstrapped.error.message,
      }),
    );
  }

  return ok(undefined);
}
