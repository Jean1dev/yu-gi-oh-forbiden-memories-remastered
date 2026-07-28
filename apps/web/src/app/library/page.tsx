import { LibraryClient } from "./library-client.tsx";

/**
 * Static app shell, cacheable by the service worker (ADR-004). Nothing is
 * pre-rendered here: the index depends on the authenticated player and on
 * local storage, both resolved client-side by `LibraryClient` (spec
 * library/F02, Decision 10).
 */
export default function LibraryPage() {
  return <LibraryClient />;
}
