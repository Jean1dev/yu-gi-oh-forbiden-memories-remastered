import type { ReactNode } from "react";
import styles from "./duel-rail.module.css";

export type DuelRailProps = Readonly<{
  label: string;
  /** Placed by the screen's grid; the rail only owns its own chrome. */
  className?: string | undefined;
  children: ReactNode;
}>;

/**
 * A vertical strip of duel chrome flanking the board.
 *
 * It styles its buttons by descendance rather than exporting a button
 * component, so the controls it hosts — `SurrenderButton`, the fusion toggle,
 * the end-of-turn action slot — keep their own markup and accessible names.
 */
export function DuelRail({ label, className, children }: DuelRailProps) {
  return (
    <div className={`${styles.rail} ${className ?? ""}`} aria-label={label}>
      {children}
    </div>
  );
}
