import type { ReactNode } from "react";
import styles from "./duel-hand-bar.module.css";

export function DuelHandBar({ children }: { readonly children: ReactNode }) {
  return <footer className={styles.bar}>{children}</footer>;
}
