import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Builds the Supabase client the rest of `apps/web` reads the authenticated
 * session and the collection through. Throws on missing configuration: this
 * runs once at app start, and a misconfigured deployment should fail loudly
 * rather than serve every request a confusing downstream error.
 */
export function createSupabaseClient(): SupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  if (url === undefined || publishableKey === undefined) {
    throw new Error(
      "Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.",
    );
  }
  return createClient(url, publishableKey);
}

/**
 * Reads the player id out of the client's authenticated session
 * (`player_id` corresponds to `auth.uid()`, `docs/arquitetura.md` §5.1).
 * `undefined` when there is no session — the caller decides what that means
 * (spec build-deck/F01 §3, step 1: `sessao_ausente`, no network or cache touched).
 */
export async function getAuthenticatedPlayerId(client: SupabaseClient): Promise<string | undefined> {
  const { data, error } = await client.auth.getUser();
  if (error || data.user === null) {
    return undefined;
  }
  return data.user.id;
}
