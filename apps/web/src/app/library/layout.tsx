import type { ReactNode } from "react";

/**
 * Declares the `@modal` parallel slot (spec library/F02, Decision 4): the
 * grid (or the full detail page) renders as `children`, and an intercepted
 * navigation to `/library/[cardNumber]` fills `modal` alongside it instead
 * of replacing it — that is what lets the detail appear as an overlay on
 * top of the grid without losing its scroll position.
 */
export default function LibraryLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
