import type { ReactNode } from "react";

import styles from "./detail-modal.module.css";

export type DetailModalProps = Readonly<{ children: ReactNode }>;

/**
 * Shell for the intercepted detail route (spec library/F02, Decision 4): a
 * centered dialog over the grid on wide viewports, full-bleed on narrow
 * ones — the same route, only the CSS treatment changes. Closing relies on
 * the system back button, which works because this is a real navigation to
 * `/library/[cardNumber]`, not component-managed open/close state.
 */
export function DetailModal({ children }: DetailModalProps) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
