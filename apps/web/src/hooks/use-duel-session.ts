"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DuelAction,
  DuelEvent,
  DuelSession,
  Duelist,
  MatchOrchestrationInput,
  ReadyDeck,
} from "@yugioh/shared";
import { buildMatchInput } from "../lib/free-duel/build-match-input.ts";
import {
  createDuelRuntime,
  type CreateDuelRuntimeInput,
  type DuelRuntime,
} from "../lib/free-duel/duel-runtime.ts";
import { createDuelSessionStore, type DuelSessionStore } from "../stores/free-duel/duel-session-store.ts";

export type DuelSessionContext = Readonly<{ duelist: Duelist; playerDeck: ReadyDeck }>;
export type StartDuelMatch = (
  context: DuelSessionContext,
  input: MatchOrchestrationInput,
) => DuelSession | Promise<DuelSession>;

export type UseDuelSessionOptions = Readonly<{
  duelistId: string;
  catalogCards: CreateDuelRuntimeInput["cards"];
  loadContext: (duelistId: string) => Promise<DuelSessionContext | null>;
  onMissingContext: () => void;
  enabled?: boolean | undefined;
  startMatch?: StartDuelMatch | undefined;
  createRuntime?: ((input: CreateDuelRuntimeInput) => DuelRuntime) | undefined;
  onEvents?: ((events: readonly DuelEvent[]) => void) | undefined;
}>;

export type DuelSessionView = Readonly<{
  session: DuelSession;
  context: DuelSessionContext | null;
  busy: boolean;
  lastRefusal: DuelSessionStore["lastRefusal"];
  applyAction: DuelRuntime["applyAction"] | undefined;
  resolveResult: DuelRuntime["resolveResult"] | undefined;
  submitAction(action: DuelAction): Promise<void>;
  interrupt(action: DuelAction): void;
  replaceSession(session: DuelSession): void;
}>;

export function useDuelSession({
  duelistId,
  catalogCards,
  loadContext,
  onMissingContext,
  enabled = true,
  startMatch,
  createRuntime = createDuelRuntime,
  onEvents,
}: UseDuelSessionOptions): DuelSessionView {
  const [legacySession, setLegacySession] = useState<DuelSession>({ status: "not_started" });
  const [context, setContext] = useState<DuelSessionContext | null>(null);
  const [runtime] = useState(() =>
    startMatch === undefined ? createRuntime({ cards: catalogCards }) : null,
  );
  const [store] = useState(() =>
    runtime === null
      ? null
      : createDuelSessionStore({
          start: runtime.start,
          advance: runtime.advanceDependencies,
          onEvents,
        }),
  );
  const [storeSnapshot, setStoreSnapshot] = useState(() => store?.getState());
  const matchStarted = useRef(false);

  useEffect(() => {
    if (store === null) return undefined;
    return store.subscribe((snapshot) => setStoreSnapshot(snapshot));
  }, [store]);

  useEffect(() => {
    if (!enabled) return;
    if (matchStarted.current) return;
    matchStarted.current = true;
    void loadContext(duelistId).then(async (loaded) => {
      if (!loaded) {
        onMissingContext();
        return;
      }
      setContext(loaded);
      const input = buildMatchInput({
        duelistId,
        playerDeck: loaded.playerDeck,
        duelist: loaded.duelist,
      });
      if (startMatch !== undefined) {
        setLegacySession(await startMatch(loaded, input));
        return;
      }
      await store?.getState().start(input, loaded.duelist);
    });
  }, [duelistId, enabled, loadContext, onMissingContext, startMatch, store]);

  return {
    session: storeSnapshot?.session ?? legacySession,
    context,
    busy: storeSnapshot?.busy ?? false,
    lastRefusal: storeSnapshot?.lastRefusal,
    applyAction: runtime?.applyAction,
    resolveResult: runtime?.resolveResult,
    submitAction: (action) => store?.getState().submitAction(action) ?? Promise.resolve(),
    interrupt: (action) => store?.getState().interrupt(action),
    replaceSession: setLegacySession,
  };
}
