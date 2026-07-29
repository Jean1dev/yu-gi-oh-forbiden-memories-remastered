import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Declares the `@modal` parallel slot (spec library/F02, Decision 4): the
 * grid (or the full detail page) renders as `children`, and an intercepted
 * navigation to `/library/[cardNumber]` fills `modal` alongside it instead
 * of replacing it — that is what lets the detail appear as an overlay on
 * top of the grid without losing its scroll position.
 *
 * Also carries the way back to the main menu. A real link rather than
 * `history.back()`: the Library is reachable by its URL directly, and then
 * there is no history to go back to.
 */
export default function LibraryLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <main className="page">
      <p>
        <Link href="/">◀ Voltar ao menu</Link>
      </p>
      <h1>Library</h1>
      {children}
      {modal}
    </main>
  );
}
