import { log } from "../../../../lib/logging.ts";
import { onAccountCreated } from "../../../../lib/initial-deck/on-account-created.ts";
import { createSupabaseClient } from "../../../../lib/supabase/client.ts";

/**
 * Seeds a player's initial deck and collection, the caller build-deck/F02
 * declared but nothing invoked (`onAccountCreated` is "the contract expected by
 * Auth/Cadastro", cross-PRD). Until that PRD exists, the sign-in screen calls
 * this endpoint right after a successful sign-up or sign-in.
 *
 * The player id comes from **verifying the bearer token**, never from the
 * request body: `onAccountCreated` runs with the service-role client, which
 * bypasses RLS entirely, so a caller-supplied id would let anyone seed — and
 * overwrite the collection of — any account. That is the same broken access
 * control migration 0006 had to retrofit onto `apply_card_reward`; here it is
 * closed at the only door that opens.
 *
 * Idempotent by construction: the underlying `persist_initial_deck` RPC inserts
 * with `ON CONFLICT DO NOTHING`, so a second call for the same player is an
 * observable no-op (`createdNow: false`), never an error. Calling it on every
 * sign-in is therefore safe and covers accounts created before this endpoint
 * existed.
 */
export async function POST(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") === true ? authorization.slice(7) : undefined;
  if (token === undefined || token === "") {
    return Response.json({ error: "missing_bearer_token" }, { status: 401 });
  }

  const { data, error } = await createSupabaseClient().auth.getUser(token);
  if (error || data.user === null) {
    return Response.json({ error: "invalid_session" }, { status: 401 });
  }
  const playerId = data.user.id;

  const result = await onAccountCreated(playerId);
  if (!result.ok) {
    log("error", "account_bootstrap_failed", {
      playerId,
      code: result.error.code,
      cause: result.error.message,
    });
    return Response.json({ error: result.error.code }, { status: 503 });
  }

  log("info", "account_bootstrap_succeeded", { playerId, createdNow: result.value.createdNow });
  return Response.json({ createdNow: result.value.createdNow });
}
