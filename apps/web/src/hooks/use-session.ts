"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseClient } from "../lib/supabase/client.ts";

/** What `useSession` reports about the current player. */
export type SessionState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "signed-out" }>
  /** A real Supabase anonymous session (`signInAnonymously`) — has a `playerId`, no e-mail yet. */
  | Readonly<{ status: "guest"; playerId: string }>
  | Readonly<{ status: "authenticated"; playerId: string; email: string | undefined }>
  /** The app has no Supabase configuration at all — a deployment problem, not a player one. */
  | Readonly<{ status: "misconfigured" }>;

/** Classifies a Supabase user (or its absence) into the session states above. */
function deriveSessionState(user: User | null): SessionState {
  if (user === null) {
    return { status: "signed-out" };
  }
  if (user.is_anonymous === true) {
    return { status: "guest", playerId: user.id };
  }
  return { status: "authenticated", playerId: user.id, email: user.email };
}

/**
 * The session every screen reads to decide between "show the game" and "send
 * the player to /login". Thin React adapter, the same shape as `useCollection`
 * (spec build-deck/F01, Decision 5).
 *
 * `createSupabaseClient` throws when the environment is not configured — a
 * deliberate fail-loud contract for a misconfigured deployment. That throw is
 * caught here and turned into `misconfigured`, so a missing `.env.local`
 * surfaces as a readable message on the page instead of an unhandled rejection
 * inside an effect, which is what every other hook would produce.
 *
 * Subscribes to `onAuthStateChange` rather than reading the user once: sign-in,
 * sign-out and token refresh all happen while a screen is mounted, and the
 * browser client keeps the session in local storage across tabs.
 */
export function useSession(): SessionState {
  const client = useMemo<SupabaseClient | undefined>(() => {
    try {
      return createSupabaseClient();
    } catch {
      return undefined;
    }
  }, []);

  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    if (client === undefined) {
      setState({ status: "misconfigured" });
      return;
    }

    let cancelled = false;

    void client.auth.getUser().then(({ data, error }) => {
      if (cancelled) {
        return;
      }
      setState(deriveSessionState(error ? null : data.user));
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setState(deriveSessionState(session === null ? null : session.user));
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  return state;
}

/** Ends the session. Safe to call when the app is misconfigured — there is nothing to end. */
export async function signOut(): Promise<void> {
  try {
    await createSupabaseClient().auth.signOut();
  } catch {
    // Nothing to sign out of.
  }
}
