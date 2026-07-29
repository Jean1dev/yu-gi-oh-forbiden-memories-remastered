"use client";

import type { DuelSession, PlayerId } from "@yugioh/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { interceptDuelExit } from "../lib/free-duel/duel-exit-guard.ts";
import {
  canSurrender,
  surrender,
} from "../lib/free-duel/surrender.ts";
import type { ApplyAction } from "../lib/free-duel/duel-session.ts";

export function useSurrender({
  session,
  playerId,
  apply,
  onSessionChange,
}: {
  readonly session: DuelSession;
  readonly playerId: PlayerId;
  readonly apply: ApplyAction;
  readonly onSessionChange: (session: DuelSession) => void;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const requestConfirmation = useCallback(() => {
    if (canSurrender(sessionRef.current)) setConfirmationOpen(true);
  }, []);
  const cancel = useCallback(() => setConfirmationOpen(false), []);
  const confirm = useCallback(() => {
    const current = sessionRef.current;
    setConfirmationOpen(false);
    const next = surrender(current, playerId, { apply });
    if (next !== current) onSessionChange(next);
  }, [apply, onSessionChange, playerId]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank") return;
      const destination = new URL(target.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }
      if (interceptDuelExit(sessionRef.current, requestConfirmation) === "blocked") {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function onPopState() {
      if (interceptDuelExit(sessionRef.current, requestConfirmation) === "blocked") {
        window.history.pushState(null, "", window.location.href);
      }
    }

    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [requestConfirmation]);

  return {
    confirmationOpen,
    available: canSurrender(session),
    requestConfirmation,
    confirm,
    cancel,
  } as const;
}
