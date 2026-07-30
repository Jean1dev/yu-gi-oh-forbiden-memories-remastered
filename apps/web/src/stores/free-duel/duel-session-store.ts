import type {
  DifficultyProfile,
  DuelAction,
  DuelSession,
  Duelist,
  MatchOrchestrationInput,
} from "@yugioh/shared";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import {
  advanceCpuDecisions,
  createDuelSession,
  submitPlayerAction,
  type AdvanceCpuDependencies,
  type CreateDuelSessionDependencies,
} from "../../lib/free-duel/duel-session.ts";

export type DuelSessionStoreDependencies = Readonly<{
  create: CreateDuelSessionDependencies;
  advance: Omit<AdvanceCpuDependencies, "cpuProfile">;
}>;

export type DuelSessionStore = Readonly<{
  session: DuelSession;
  start(input: MatchOrchestrationInput, duelist: Duelist): Promise<void>;
  submitAction(action: DuelAction): Promise<void>;
}>;

export function createDuelSessionStore(
  dependencies: DuelSessionStoreDependencies,
): UseBoundStore<StoreApi<DuelSessionStore>> {
  let cpuProfile: DifficultyProfile = { strategy: "uninitialized", parameters: {} };
  return create<DuelSessionStore>((set, get) => ({
    session: { status: "not_started" },
    async start(input, duelist) {
      cpuProfile = duelist.profile;
      let session = createDuelSession(input, dependencies.create);
      set({ session });
      if (session.status === "in_progress" && session.currentDecider === "P2") {
        session = await advanceCpuDecisions(session, {
          ...dependencies.advance,
          cpuProfile,
        });
        set({ session });
      }
    },
    async submitAction(action) {
      const session = get().session;
      if (session.status !== "in_progress") return;
      set({
        session: await submitPlayerAction(session, action, {
          ...dependencies.advance,
          cpuProfile,
        }),
      });
    },
  }));
}
