"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useSession } from "../../../hooks/use-session.ts";
import { log } from "../../../lib/logging.ts";
import { createSupabaseClient } from "../../../lib/supabase/client.ts";
import styles from "./link-email-form.module.css";
import { LINK_EMAIL_MESSAGES } from "./messages.ts";

type FormStatus =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "working" }>
  | Readonly<{ kind: "success" }>
  | Readonly<{ kind: "pending-confirmation" }>
  | Readonly<{ kind: "failed"; message: string }>;

/**
 * Promotes a guest (Supabase anonymous) session to a permanent one via
 * `auth.updateUser`, never `auth.linkIdentity` — that call only accepts
 * OAuth/OIDC credentials, no email+password overload exists for it.
 * `auth.uid()` never changes across this call, so whatever collection/deck
 * this guest already has stays theirs; nothing here migrates or merges data.
 *
 * Whether the account flips to permanent immediately or waits on a
 * confirmation e-mail depends on this project's Supabase e-mail-change
 * settings, so this screen branches on the actual response (`is_anonymous`)
 * rather than assuming one outcome.
 */
export function LinkEmailForm() {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  const busy = status.kind === "working";

  useEffect(() => {
    if (session.status === "signed-out") {
      router.replace("/login");
    } else if (session.status === "authenticated") {
      router.replace("/");
    }
  }, [session.status, router]);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus({ kind: "working" });

    let client;
    try {
      client = createSupabaseClient();
    } catch {
      setStatus({ kind: "failed", message: LINK_EMAIL_MESSAGES.misconfigured });
      return;
    }

    const { data, error } = await client.auth.updateUser(
      { email, password },
      { emailRedirectTo: `${window.location.origin}/login/link-email` },
    );
    if (error) {
      log("warn", "link_email_failed", { cause: error.message, code: error.code });
      setStatus({
        kind: "failed",
        message:
          error.code === "email_exists" ? LINK_EMAIL_MESSAGES.emailInUse : LINK_EMAIL_MESSAGES.failed,
      });
      return;
    }

    if (data.user.is_anonymous === true) {
      setStatus({ kind: "pending-confirmation" });
      return;
    }

    setStatus({ kind: "success" });
    router.push("/");
  }

  if (session.status === "loading") {
    return (
      <main className="page">
        <p>{LINK_EMAIL_MESSAGES.loadingSession}</p>
      </main>
    );
  }

  if (session.status === "misconfigured") {
    return (
      <main className="page">
        <p role="alert">{LINK_EMAIL_MESSAGES.misconfigured}</p>
      </main>
    );
  }

  if (session.status !== "guest") {
    return (
      <main className="page">
        <p>{LINK_EMAIL_MESSAGES.notGuest}</p>
        <p className={styles.hint}>
          <Link href="/">{LINK_EMAIL_MESSAGES.back}</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>{LINK_EMAIL_MESSAGES.title}</h1>
      <p>{LINK_EMAIL_MESSAGES.intro}</p>

      <form
        className={styles.frame}
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="link-email-email">
            {LINK_EMAIL_MESSAGES.emailLabel}
          </label>
          <input
            id="link-email-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="link-email-password">
            {LINK_EMAIL_MESSAGES.passwordLabel}
          </label>
          <input
            id="link-email-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} type="submit" disabled={busy}>
            {busy ? LINK_EMAIL_MESSAGES.working : LINK_EMAIL_MESSAGES.submit}
          </button>
        </div>

        {status.kind === "pending-confirmation" ? (
          <p className={styles.feedback} role="status">
            {LINK_EMAIL_MESSAGES.pendingConfirmation}
          </p>
        ) : null}
        {status.kind === "success" ? (
          <p className={styles.feedback} role="status">
            {LINK_EMAIL_MESSAGES.success}
          </p>
        ) : null}
        {status.kind === "failed" ? (
          <p className={styles.feedback} role="alert">
            {status.message}
          </p>
        ) : null}
      </form>

      <p className={styles.hint} style={{ textAlign: "center" }}>
        <Link href="/">{LINK_EMAIL_MESSAGES.back}</Link>
      </p>
    </main>
  );
}
