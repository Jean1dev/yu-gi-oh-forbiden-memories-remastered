import type {
  DifficultyProfile,
  DomainError,
  DuelAction,
  DuelEvent,
  DuelSession,
  Duelist,
  MatchOrchestrationInput,
} from "@yugioh/shared";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import {
  advanceCpuDecisions,
  createDuelSession,
  interruptDuelSession,
  submitPlayerAction,
  type AdvanceCpuDependencies,
  type CreateDuelSessionDependencies,
} from "../../lib/free-duel/duel-session.ts";

export type DuelSessionStoreDependencies = Readonly<{
  create: CreateDuelSessionDependencies;
  advance: Omit<AdvanceCpuDependencies, "cpuProfile" | "onStep">;
  onEvents?: ((events: readonly DuelEvent[]) => void) | undefined;
}>;

export type DuelSessionStore = Readonly<{
  session: DuelSession;
  busy: boolean;
  lastRefusal?: DomainError | undefined;
  runToken: number;
  start(input: MatchOrchestrationInput, duelist: Duelist): Promise<void>;
  submitAction(action: DuelAction): Promise<void>;
  interrupt(action: DuelAction): void;
}>;

export function createDuelSessionStore(
  dependencies: DuelSessionStoreDependencies,
): UseBoundStore<StoreApi<DuelSessionStore>> {
  let cpuProfile: DifficultyProfile = { strategy: "uninitialized", parameters: {} };
  function publishEvents(events: readonly DuelEvent[]): void {
    if (events.length > 0) dependencies.onEvents?.(events);
  }

  return create<DuelSessionStore>((set, get) => ({
    session: { status: "not_started" },
    busy: false,
    lastRefusal: undefined,
    runToken: 0,
    async start(input, duelist) {
      const runToken = get().runToken + 1;
      cpuProfile = duelist.profile;
      set({ busy: true, lastRefusal: undefined, runToken });
      let session = createDuelSession(input, dependencies.create);
      set({ session });
      if (session.status === "in_progress" && session.currentDecider === "P2") {
        session = await advanceCpuDecisions(session, {
          ...dependencies.advance,
          cpuProfile,
          onStep: (step) => {
            if (get().runToken !== runToken) return;
            publishEvents(step.events);
            set({ session: step.session });
          },
        });
        if (get().runToken !== runToken) return;
        set({ session });
      }
      if (get().runToken === runToken) set({ busy: false });
    },
    async submitAction(action) {
      const session = get().session;
      if (session.status !== "in_progress" || get().busy) return;
      const runToken = get().runToken;
      set({ busy: true, lastRefusal: undefined });
      const outcome = await submitPlayerAction(session, action, {
        ...dependencies.advance,
        cpuProfile,
        onStep: (step) => {
          if (get().runToken !== runToken) return;
          publishEvents(step.events);
          set({ session: step.session });
        },
      });
      if (get().runToken !== runToken) return;
      publishEvents(outcome.events);
      set({
        session: outcome.session,
        lastRefusal: outcome.refusal,
        busy: false,
      });
    },
    interrupt(action) {
      const session = get().session;
      if (session.status !== "in_progress") return;
      const runToken = get().runToken + 1;
      const next = interruptDuelSession(session, action, { apply: dependencies.advance.apply });
      set({ session: next, busy: false, lastRefusal: undefined, runToken });
    },
  }));
}
