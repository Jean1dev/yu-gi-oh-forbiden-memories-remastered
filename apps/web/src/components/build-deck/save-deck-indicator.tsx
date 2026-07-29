"use client";

import type { SyncActiveDeckSummary } from "@yugioh/shared";

import type { SaveActiveDeckStatus } from "../../hooks/use-active-deck-persistence.ts";
import { BUILD_DECK_MESSAGES } from "./messages.ts";

export type SaveDeckIndicatorProps = Readonly<{
  /** Enabled only when F06's `validateDeckDraft` reports the draft valid (spec build-deck/F07 §6). */
  canSave: boolean;
  saveStatus: SaveActiveDeckStatus;
  conflictDetected: boolean;
  /** Last outcome of the background sync (`useActiveDeckSync`), if any pending save existed to resolve. */
  syncSummary: SyncActiveDeckSummary | undefined;
  onSave(): void;
}>;

/**
 * `saveActiveDeck`'s only `err(...)` outcome is `deck_persistence_unavailable`
 * (network and local storage both unavailable, spec build-deck/F07 §6) —
 * every other case (refused/saved_offline/session_expired) travels as an
 * `ok` result with a different `status`, so no error-code switch is needed
 * here.
 */
function saveStatusMessage(saveStatus: SaveActiveDeckStatus): string | undefined {
  if (saveStatus.kind === "saving") {
    return BUILD_DECK_MESSAGES.deckSaving;
  }
  if (saveStatus.kind === "error") {
    return BUILD_DECK_MESSAGES.deckSavePersistenceUnavailable;
  }
  if (saveStatus.kind === "done") {
    switch (saveStatus.result.status) {
      case "saved":
        return BUILD_DECK_MESSAGES.deckSaved;
      case "saved_offline":
        return BUILD_DECK_MESSAGES.deckSavedOffline;
      case "refused":
        return BUILD_DECK_MESSAGES.deckSaveRefused;
      case "session_expired":
        return BUILD_DECK_MESSAGES.deckSaveSessionExpired;
    }
  }
  return undefined;
}

function syncStatusMessage(summary: SyncActiveDeckSummary | undefined): string | undefined {
  if (summary === undefined) {
    return undefined;
  }
  switch (summary.status) {
    case "synced":
      return BUILD_DECK_MESSAGES.deckSynced;
    case "refused":
      return BUILD_DECK_MESSAGES.deckSaveRefused;
    case "session_expired":
      return BUILD_DECK_MESSAGES.deckSaveSessionExpired;
    case "network_failure":
    case "no_pending":
      return undefined;
  }
}

/**
 * The "Salvar deck" button plus its status/conflict indicator (spec
 * build-deck/F07 §3, §6). The conflict banner and the save/sync messages are
 * independent `aria-live` regions — a background sync landing and a manual
 * save can, in principle, both have something to report at once.
 */
export function SaveDeckIndicator({ canSave, saveStatus, conflictDetected, syncSummary, onSave }: SaveDeckIndicatorProps) {
  const saveMessage = saveStatusMessage(saveStatus);
  const syncMessage = syncStatusMessage(syncSummary);

  return (
    <div>
      <button type="button" disabled={!canSave || saveStatus.kind === "saving"} onClick={onSave}>
        {BUILD_DECK_MESSAGES.saveDeckButton}
      </button>
      {conflictDetected ? <p role="status">{BUILD_DECK_MESSAGES.deckConflictNotice}</p> : null}
      {saveMessage !== undefined ? (
        <p role="status" aria-live="polite">
          {saveMessage}
        </p>
      ) : null}
      {syncMessage !== undefined ? (
        <p role="status" aria-live="polite">
          {syncMessage}
        </p>
      ) : null}
    </div>
  );
}
