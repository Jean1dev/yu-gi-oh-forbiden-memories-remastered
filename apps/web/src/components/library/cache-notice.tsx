import { LIBRARY_MESSAGES } from "./messages.ts";

export type CacheNoticeProps = Readonly<{
  /** ISO 8601 — when the collection half of the loaded index left the server (library/F01, `LoadedLibrary.syncedAt`). */
  syncedAt: string;
}>;

/** `collectionOrigin === "cache"` is success, not failure (library/F01, Decision 4) — shown above the progress indicator. */
export function CacheNotice({ syncedAt }: CacheNoticeProps) {
  const formatted = new Date(syncedAt).toLocaleString("pt-BR");
  return (
    <p role="status">
      {LIBRARY_MESSAGES.cacheNotice} Sincronizado em {formatted}.
    </p>
  );
}
