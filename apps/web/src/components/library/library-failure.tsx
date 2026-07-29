"use client";

export type LibraryFailureProps = Readonly<{
  message: string;
  onReload: () => void;
}>;

/**
 * Covers catalog-unavailable, collection-unavailable and session-missing
 * (spec library/F02 §3, §6) — the three collapse onto `useLibrary`'s single
 * `"error"` status, distinguished only by the message the caller passes in
 * from `DomainError.code`. The grid is never mounted alongside this state.
 */
export function LibraryFailure({ message, onReload }: LibraryFailureProps) {
  return (
    <div role="alert">
      <p>{message}</p>
      <button type="button" onClick={onReload}>
        Tentar novamente
      </button>
    </div>
  );
}
