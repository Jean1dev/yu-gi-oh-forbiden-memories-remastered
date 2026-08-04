import { DomainError, err, ok, type Result } from "@yugioh/shared";

import {
  YgoprodeckApiResponseSchema,
  type YgoprodeckCardResponse,
} from "../src/ygoprodeck/types.ts";

/**
 * The only file in `renderizacao-cartas/F02` that calls `fetch` — everything
 * under `src/ygoprodeck/` stays pure (spec F02, Alocação no Monorepo).
 */

const API_BASE = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const TIMEOUT_MS = 10_000;

async function get(url: string): Promise<Result<readonly YgoprodeckCardResponse[], DomainError>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error: unknown) {
    return err(new DomainError(`request to ${url} failed`, "http_error", { cause: error }));
  } finally {
    clearTimeout(timeout);
  }

  // The API answers "no match" with a 400 body like {"error": "No card matching..."} —
  // that is a legitimate empty result, not a transport failure (spec F02 §6).
  if (response.status === 400) {
    return ok([]);
  }
  if (!response.ok) {
    return err(
      new DomainError(`request to ${url} returned ${String(response.status)}`, "http_error", {
        status: response.status,
      }),
    );
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (error: unknown) {
    return err(new DomainError(`response from ${url} is not valid JSON`, "invalid_response", {
      cause: error,
    }));
  }

  const validated = YgoprodeckApiResponseSchema.safeParse(parsed);
  if (!validated.success) {
    return err(
      new DomainError(`response from ${url} does not match the expected shape`, "invalid_response", {
        issues: validated.error.issues,
      }),
    );
  }

  return ok(validated.data.data ?? []);
}

/** Exact match by the YGOPRODeck numeric card id (spec F02, Decision 2). */
export async function fetchById(
  id: number,
): Promise<Result<readonly YgoprodeckCardResponse[], DomainError>> {
  return get(`${API_BASE}?id=${String(id)}`);
}

/** Exact-name match, used only for the ~24 cards without a `password` (spec F02, Decision 3). */
export async function fetchByName(
  name: string,
): Promise<Result<readonly YgoprodeckCardResponse[], DomainError>> {
  return get(`${API_BASE}?name=${encodeURIComponent(name)}`);
}
