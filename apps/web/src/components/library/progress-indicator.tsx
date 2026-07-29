import type { CollectionProgress } from "@yugioh/shared";

export type ProgressIndicatorProps = Readonly<{ progress: CollectionProgress }>;

/**
 * "X of N obtained", `N` always interpolated from {@link CollectionProgress}
 * (spec library/F02, Decision 12) — never a local literal. `role="status"` is
 * a live region so a screen reader announces the new count after `reload()`
 * brings in a newly obtained card.
 */
export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  return (
    <p role="status">
      {progress.obtained} de {progress.total} obtidas
    </p>
  );
}
