import { getPublicDuelState } from "@yugioh/rules";
import {
  DomainError,
  err,
  ok,
  type ApplyResult,
  type DuelAction,
  type DuelEvent,
  type DuelState,
  type Duelist,
  type MatchOrchestrationInput,
  type Result,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { createDuelSessionStore } from "./duel-session-store.ts";
import { emptyDuelStatsByPlayer } from "@yugioh/engine";

const field = {
  monsters: [
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
  ],
  spells: [
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
    { occupied: false },
  ],
} as const;

function state(activePlayer: "P1" | "P2", phase: DuelState["phase"] = "main"): DuelState {
  return {
    players: {
      P1: { lp: 8000, hand: [], deck: [], field, handPlayUsed: false },
      P2: { lp: 8000, hand: [], deck: [], field, handPlayUsed: false },
    },
    activeField: null,
    activePlayer,
    turn: 1,
    phase,
    seed: 1,
    stats: emptyDuelStatsByPlayer(),
  };
}

const input: MatchOrchestrationInput = {
  duelistId: "seto",
  playerComposition: {},
  cpuComposition: {},
};

const duelist: Duelist = {
  id: "seto",
  name: "Seto",
  portrait: "/seto.png",
  difficulty: "hard",
  profile: { strategy: "aggressive", parameters: {} },
  deck: [],
  dropPool: [],
};

function event(type: DuelEvent["type"]): DuelEvent {
  return {
    type,
    originPlayer: "P2",
    involvedCards: [],
    involvedZones: [],
    context: {},
  };
}

function createDependencies({
  initialState = state("P1"),
  apply = (current: DuelState) => ok({ state: current, events: [] }),
  decide = async (): Promise<DuelAction> => ({ type: "advance_phase" }),
  onEvents,
}: {
  readonly initialState?: DuelState;
  readonly apply?: (state: DuelState, action: DuelAction) => Result<ApplyResult, DomainError>;
  readonly decide?: () => Promise<DuelAction>;
  readonly onEvents?: ((events: readonly DuelEvent[]) => void) | undefined;
} = {}) {
  return {
    start: () => ({
      status: "in_progress" as const,
      duelSessionId: "session-1",
      duelistId: "seto",
      state: initialState,
      currentDecider: initialState.activePlayer,
    }),
    advance: {
      apply,
      closeReactionWindow: (current: DuelState) => ok(current),
      aiAgent: { decide },
      getPublicDuelState,
    },
    onEvents,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe("duel session store", () => {
  it("starts and updates the in-memory session", async () => {
    const store = createDuelSessionStore(createDependencies());

    expect(store.getState().session).toEqual({ status: "not_started" });
    await store.getState().start(input, duelist);

    expect(store.getState()).toMatchObject({
      busy: false,
      session: {
        status: "in_progress",
        duelSessionId: "session-1",
      },
    });
  });

  it("drives a full passive CPU turn and publishes each step", async () => {
    const steps = [
      state("P2", "draw"),
      state("P2", "main"),
      state("P2", "battle"),
      state("P1", "main"),
    ];
    const onEvents = vi.fn();
    const apply = vi.fn(() => ok({ state: steps.shift() ?? state("P1"), events: [event("onTurnEnd")] }));
    const store = createDuelSessionStore(
      createDependencies({ initialState: state("P2", "draw"), apply, onEvents }),
    );

    await store.getState().start(input, duelist);

    expect(apply).toHaveBeenCalledTimes(4);
    expect(onEvents).toHaveBeenCalledTimes(4);
    expect(store.getState()).toMatchObject({
      busy: false,
      session: { status: "in_progress", currentDecider: "P1" },
    });
  });

  it("marks busy during a dispatch and clears it at the end", async () => {
    const gate = deferred<DuelAction>();
    const store = createDuelSessionStore(
      createDependencies({
        initialState: state("P1"),
        apply: vi
          .fn()
          .mockReturnValueOnce(ok({ state: state("P2"), events: [] }))
          .mockReturnValue(ok({ state: state("P1"), events: [] })),
        decide: () => gate.promise,
      }),
    );
    await store.getState().start(input, duelist);

    const dispatch = store.getState().submitAction({ type: "advance_phase" });
    expect(store.getState().busy).toBe(true);
    gate.resolve({ type: "advance_phase" });
    await dispatch;

    expect(store.getState().busy).toBe(false);
  });

  it("stores lastRefusal when the engine rejects a player action", async () => {
    const store = createDuelSessionStore(
      createDependencies({
        apply: () => err(new DomainError("Illegal phase.", "phase_mismatch")),
      }),
    );
    await store.getState().start(input, duelist);

    await store.getState().submitAction({ type: "advance_phase" });

    expect(store.getState().lastRefusal?.code).toBe("phase_mismatch");
    expect(store.getState().session.status).toBe("in_progress");
  });

  it("keeps an interrupt result when an older CPU loop finishes later", async () => {
    const gate = deferred<DuelAction>();
    const endedState: DuelState = {
      ...state("P2"),
      outcome: { status: "decisive", winner: "P2", loser: "P1", reason: "surrender" },
    };
    const apply = vi
      .fn()
      .mockReturnValueOnce(ok({ state: endedState, events: [] }))
      .mockReturnValue(ok({ state: state("P1"), events: [] }));
    const store = createDuelSessionStore(
      createDependencies({
        initialState: state("P2"),
        apply,
        decide: () => gate.promise,
      }),
    );

    const start = store.getState().start(input, duelist);
    expect(store.getState().busy).toBe(true);

    store.getState().interrupt({ type: "surrender", player: "P1" });
    expect(store.getState().session).toMatchObject({ status: "ended" });

    gate.resolve({ type: "advance_phase" });
    await start;

    expect(store.getState().session).toMatchObject({ status: "ended" });
  });
});
