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
 * Builds the service-role Supabase client for the trusted server-side
 * execution context the `persist_initial_deck` RPC's restricted `GRANT
 * EXECUTE` requires (spec build-deck/F02, Decision 11): the deck's content
 * is computed by the caller before the RPC runs, so an ordinary client
 * calling it directly could persist a forged deck, unlike a reward RPC
 * where the server decides the value. Reads `SUPABASE_URL` /
 * `SUPABASE_SERVICE_ROLE_KEY` — deliberately **not** the `NEXT_PUBLIC_`
 * pair `createSupabaseClient` uses, so this never gets inlined into a
 * client bundle. Callers must only invoke this from server-only code
 * (a Route Handler, Server Action, or webhook handler), never from a
 * component that can render on the client.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (url === undefined || serviceRoleKey === undefined) {
    throw new Error(
      "Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  return createClient(url, serviceRoleKey);
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
