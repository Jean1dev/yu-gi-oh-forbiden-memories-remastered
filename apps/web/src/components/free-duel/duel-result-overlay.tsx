import type { ReactNode } from "react";
import styles from "./duel-result-overlay.module.css";

export function DuelResultOverlay({ children }: { readonly children: ReactNode }) {
  return (
    <section className={styles.overlay} aria-label="Resultado do duelo">
      <div className={styles.panel}>{children}</div>
    </section>
  );
}
