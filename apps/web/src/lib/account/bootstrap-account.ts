import { DomainError, err, ok, type Result } from "@yugioh/shared";

/**
 * Asks the server to seed the player's initial deck and collection.
 *
 * The endpoint derives the player from this token — never from anything this
 * function sends — so the only thing to pass is the session's access token.
 * Idempotent on the server, which is why the sign-in screen can call it after
 * every sign-in and not only after a sign-up.
 */
export async function bootstrapAccount(accessToken: string): Promise<Result<boolean, DomainError>> {
  let response: Response;
  try {
    response = await fetch("/api/account/bootstrap", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (cause) {
    return err(
      new DomainError("Could not reach the bootstrap endpoint.", "bootstrap_unavailable", {
        cause: String(cause),
      }),
    );
  }

  if (!response.ok) {
    return err(
      new DomainError(`Bootstrap failed with status ${response.status}.`, "bootstrap_failed", {
        status: response.status,
      }),
    );
  }

  const body = (await response.json()) as { createdNow?: boolean };
  return ok(body.createdNow === true);
}
