"use client";

export type CollectionFailureProps = Readonly<{
  message: string;
}>;

/**
 * Failure states inherited from build-deck/F01 (collection unavailable,
 * session missing) and F04's own catalog-unavailable case. `useCollection`
 * exposes no explicit reload (spec build-deck/F01, Decision 8), so the
 * "tentar novamente" action reloads the page, which re-runs the load on mount.
 */
export function CollectionFailure({ message }: CollectionFailureProps) {
  return (
    <div role="alert">
      <p>{message}</p>
      <button type="button" onClick={() => window.location.reload()}>
        Tentar novamente
      </button>
    </div>
  );
}
