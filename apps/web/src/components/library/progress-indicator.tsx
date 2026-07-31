import type { CollectionProgress } from "@yugioh/shared";

import styles from "./progress-indicator.module.css";

export type ProgressIndicatorProps = Readonly<{ progress: CollectionProgress }>;

/**
 * "X of N obtained", `N` always interpolated from {@link CollectionProgress}
 * (spec library/F02, Decision 12) — never a local literal. `role="status"` is
 * a live region so a screen reader announces the new count after `reload()`
 * brings in a newly obtained card. The dithered fill below the count mirrors
 * the design system's core `ProgressIndicator` component.
 */
export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const percent = Math.round((progress.obtained / progress.total) * 100);

  return (
    <div role="status" className={styles.wrapper}>
      <p className={styles.label}>
        {progress.obtained} de {progress.total} obtidas
      </p>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
