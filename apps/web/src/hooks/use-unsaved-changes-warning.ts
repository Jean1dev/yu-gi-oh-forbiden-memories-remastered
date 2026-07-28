"use client";

import { useEffect } from "react";

export type UseUnsavedChangesWarningResult = Readonly<{
  /** Shows the native confirm with the PRD text; `true` means the caller may proceed with navigation. */
  confirmInternalNavigation(): boolean;
}>;

const CONFIRM_LEAVE_MESSAGE = "Você tem alterações não salvas. Sair sem salvar?";

/**
 * Compensates for the draft having no persistence (spec build-deck/F05,
 * Decisions 3+4): registers `beforeunload` while there is an unsaved change
 * (covers closing/reloading the tab) and exposes `confirmInternalNavigation`
 * for the guard that runs before leaving the editor's route inside the app.
 * Both use the native browser dialogs — no custom modal (Decision 10).
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): UseUnsavedChangesWarningResult {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  function confirmInternalNavigation(): boolean {
    if (!hasUnsavedChanges) {
      return true;
    }
    return window.confirm(CONFIRM_LEAVE_MESSAGE);
  }

  return { confirmInternalNavigation };
}
