"use client";

import Link from "next/link";

import { signOut, useSession } from "../../hooks/use-session.ts";
import styles from "./main-menu.module.css";
import { MENU_ITEMS, MENU_MESSAGES, type MenuItem } from "./menu-items.ts";

function MenuEntry({ item }: { item: MenuItem }) {
  const body = (
    <>
      <span className={styles.itemLabel}>
        {item.label}
        {item.status === "soon" ? (
          <span className={styles.badge}>{MENU_MESSAGES.soonBadge}</span>
        ) : null}
      </span>
      <span className={styles.itemDescription}>{item.description}</span>
    </>
  );

  // A module with no screen yet is rendered, but never as a link: `aria-disabled`
  // plus the visible badge say so twice, because colour alone must not carry
  // state (`docs/estetica-visual.md` §2.2).
  if (item.status === "soon" || item.href === undefined) {
    return (
      <li>
        <span className={styles.itemDisabled} aria-disabled="true">
          {body}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link className={styles.item} href={item.href}>
        {body}
      </Link>
    </li>
  );
}

/**
 * The main menu of `product.md`: the seven modules of the original game, with
 * the ones this repository has actually built as the only navigable entries.
 *
 * It is also where the session lives. The app has no other place to sign in
 * from, and every screen below it (`/build-deck`, `/library`) fails with
 * "Faça login para ver sua coleção" without one — so the menu shows who is
 * playing and links to `/login` when nobody is.
 */
export function MainMenu() {
  const session = useSession();

  return (
    <main className="page">
      <header className={styles.header}>
        <h1 className={styles.title}>{MENU_MESSAGES.title}</h1>
        <p className={styles.subtitle}>{MENU_MESSAGES.subtitle}</p>
      </header>

      <div className={styles.session}>
        {session.status === "loading" ? <span>{MENU_MESSAGES.loadingSession}</span> : null}
        {session.status === "misconfigured" ? (
          <span role="alert">{MENU_MESSAGES.misconfigured}</span>
        ) : null}
        {session.status === "anonymous" ? (
          <>
            <span>{MENU_MESSAGES.signedOutPrompt}</span>
            <Link href="/login">{MENU_MESSAGES.signIn}</Link>
          </>
        ) : null}
        {session.status === "authenticated" ? (
          <>
            <span className={styles.sessionEmail}>{session.email ?? session.playerId}</span>
            <button type="button" onClick={() => void signOut()}>
              {MENU_MESSAGES.signOut}
            </button>
          </>
        ) : null}
      </div>

      <nav className={styles.frame} aria-label="Menu principal">
        <ul className={styles.list}>
          {MENU_ITEMS.map((item) => (
            <MenuEntry key={item.id} item={item} />
          ))}
        </ul>
      </nav>
    </main>
  );
}
