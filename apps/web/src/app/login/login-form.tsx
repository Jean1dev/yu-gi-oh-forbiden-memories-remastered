"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { bootstrapAccount } from "../../lib/account/bootstrap-account.ts";
import { continueAsGuest } from "../../lib/account/continue-as-guest.ts";
import { log } from "../../lib/logging.ts";
import { createSupabaseClient } from "../../lib/supabase/client.ts";
import styles from "./login-form.module.css";
import { LOGIN_MESSAGES } from "./messages.ts";

type FormStatus =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "authenticating" }>
  | Readonly<{ kind: "bootstrapping" }>
  | Readonly<{ kind: "failed"; message: string }>;

type Intent = "sign-in" | "sign-up";

/**
 * The only way into a session in this app. Everything below the menu reads the
 * player from `auth.getUser()`, and without one every screen stops at "Faça
 * login para ver sua coleção" — a dead end until this screen existed.
 *
 * Both intents end the same way: seed the account, then return to the menu.
 * Seeding on sign-in too is deliberate — the operation is idempotent, and it is
 * what repairs accounts created before the bootstrap endpoint existed, or whose
 * first attempt failed halfway.
 *
 * Provisional in one respect: a real Auth/Cadastro PRD will own e-mail
 * confirmation, password recovery and session refresh. The session contract
 * this screen produces — a Supabase session in local storage — is the one the
 * rest of the app already consumes, so that PRD replaces this form without
 * touching anything below it.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  const busy = status.kind === "authenticating" || status.kind === "bootstrapping";

  async function submit(intent: Intent, event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus({ kind: "authenticating" });

    let client;
    try {
      client = createSupabaseClient();
    } catch {
      setStatus({ kind: "failed", message: LOGIN_MESSAGES.misconfigured });
      return;
    }

    const credentials = { email, password };
    const { data, error } =
      intent === "sign-up"
        ? await client.auth.signUp(credentials)
        : await client.auth.signInWithPassword(credentials);

    if (error || data.session === null) {
      log("warn", "login_failed", { intent, cause: error?.message });
      setStatus({
        kind: "failed",
        message:
          intent === "sign-up" ? LOGIN_MESSAGES.signUpFailed : LOGIN_MESSAGES.invalidCredentials,
      });
      return;
    }

    setStatus({ kind: "bootstrapping" });
    const bootstrapped = await bootstrapAccount(data.session.access_token);
    if (!bootstrapped.ok) {
      log("error", "login_bootstrap_failed", { cause: bootstrapped.error.message });
      setStatus({ kind: "failed", message: LOGIN_MESSAGES.bootstrapFailed });
      return;
    }

    router.push("/");
  }

  async function continueAsGuestHandler(): Promise<void> {
    setStatus({ kind: "authenticating" });

    let client;
    try {
      client = createSupabaseClient();
    } catch {
      setStatus({ kind: "failed", message: LOGIN_MESSAGES.misconfigured });
      return;
    }

    const result = await continueAsGuest(client);
    if (!result.ok) {
      log("warn", "guest_sign_in_failed", { cause: result.error.message });
      setStatus({ kind: "failed", message: LOGIN_MESSAGES.guestFailed });
      return;
    }

    router.push("/");
  }

  return (
    <main className="page">
      <h1>{LOGIN_MESSAGES.title}</h1>

      <form
        className={styles.frame}
        onSubmit={(event) => {
          void submit("sign-in", event);
        }}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            {LOGIN_MESSAGES.emailLabel}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            {LOGIN_MESSAGES.passwordLabel}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} type="submit" disabled={busy}>
            {status.kind === "authenticating" ? LOGIN_MESSAGES.working : LOGIN_MESSAGES.signIn}
          </button>
          <button
            className={styles.secondary}
            type="button"
            disabled={busy}
            onClick={(event) => {
              void submit("sign-up", event);
            }}
          >
            {LOGIN_MESSAGES.signUp}
          </button>
          <button
            className={styles.secondary}
            type="button"
            disabled={busy}
            onClick={() => {
              void continueAsGuestHandler();
            }}
          >
            {LOGIN_MESSAGES.guestCta}
          </button>
        </div>

        <p className={styles.hint}>{LOGIN_MESSAGES.guestHint}</p>

        {status.kind === "bootstrapping" ? (
          <p className={styles.feedback} role="status">
            {LOGIN_MESSAGES.preparingDeck}
          </p>
        ) : null}
        {status.kind === "failed" ? (
          <p className={styles.feedback} role="alert">
            {status.message}
          </p>
        ) : null}

        <p className={styles.hint}>{LOGIN_MESSAGES.hint}</p>
      </form>

      <p className={styles.hint} style={{ textAlign: "center" }}>
        <Link href="/">{LOGIN_MESSAGES.back}</Link>
      </p>
    </main>
  );
}
