import { getPublicDuelState } from "@yugioh/rules";
import {
  DomainError,
  err,
  ok,
  type AiAgent,
  type Card,
  type DuelAction,
  type DuelEvent,
  type DuelState,
  type MatchOrchestrationInput,
  type ReactionWindow,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import {
  advanceCpuDecisions,
  createDuelSession,
  interruptDuelSession,
  nextDecider,
  submitPlayerAction,
  type AdvanceCpuDependencies,
} from "./duel-session.ts";

const emptyField = {
  monsters: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
  spells: Array.from({ length: 5 }, () => ({ occupied: false })) as never,
};

const state = (activePlayer: "P1" | "P2", phase: DuelState["phase"] = "main"): DuelState => ({
  players: {
    P1: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
    P2: { lp: 8000, hand: [], deck: [], field: emptyField, handPlayUsed: false },
  },
  activeField: null,
  activePlayer,
  turn: 1,
  phase,
  seed: 1,
});

/** A state the engine has frozen (motor-duelo-1x1/F12) — what actually ends a session. */
const surrenderedState = (loser: "P1" | "P2"): DuelState => ({
  ...state(loser),
  outcome: {
    status: "decisive",
    winner: loser === "P1" ? "P2" : "P1",
    loser,
    reason: "surrender",
  },
});

const input: MatchOrchestrationInput = {
  duelistId: "seto",
  playerComposition: {},
  cpuComposition: {},
};

function event(type: DuelEvent["type"]): DuelEvent {
  return {
    type,
    originPlayer: "P1",
    involvedCards: [],
    involvedZones: [],
    context: {},
  };
}

function withPending(base: DuelState, type: DuelEvent["type"]): DuelState {
  return {
    ...base,
    pending: {
      type: "reaction_window",
      reactingPlayer: "P2",
      event: event(type),
    } satisfies ReactionWindow,
  };
}

function createDependencies(initialState: DuelState, reject = false) {
  return {
    buildInitializationInput: () =>
      reject
        ? err(new DomainError("invalid", "invalid_deck"))
        : ok({ players: { P1: { cards: [] }, P2: { cards: [] } }, seed: 1 }),
    initDuel: () => initialState,
    seedGenerator: () => 1,
    catalog: (): Card | undefined => undefined,
    validateDeck: () => ok({ composition: {}, cardNumbers: [], total: 40 }),
    generateSessionId: () => "session-1",
  };
}

const ai: AiAgent = { decide: async () => ({ type: "advance_phase" }) };
const profile = { strategy: "test", parameters: {} };
const closeReactionWindow = (current: DuelState) => {
  const { pending: _pending, ...next } = current;
  void _pending;
  return ok(next);
};

function dependencies(
  overrides: Partial<AdvanceCpuDependencies> = {},
): AdvanceCpuDependencies {
  return {
    apply: (current) => ok({ state: current, events: [] }),
    closeReactionWindow,
    aiAgent: ai,
    getPublicDuelState,
    cpuProfile: profile,
    ...overrides,
  };
}

describe("duel session", () => {
  it("creates a stable session id on success and engine rejection", () => {
    expect(createDuelSession(input, createDependencies(state("P1")))).toMatchObject({
      status: "in_progress",
      duelSessionId: "session-1",
      currentDecider: "P1",
    });
    expect(createDuelSession(input, createDependencies(state("P1"), true))).toEqual({
      status: "failed",
      duelSessionId: "session-1",
      duelistId: "seto",
      reason: "deck_rejected_by_engine",
    });
  });

  it("uses a reaction window before the active player", () => {
    expect(nextDecider(withPending(state("P1"), "onDraw"))).toBe("P2");
  });

  it("advances CPU actions until control returns to P1", async () => {
    const apply = vi.fn(() => ok({ state: state("P1"), events: [] }));
    const active = createDuelSession(input, createDependencies(state("P2")));
    expect(active.status).toBe("in_progress");
    if (active.status !== "in_progress") return;
    const result = await advanceCpuDecisions(active, dependencies({ apply }));
    expect(apply).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ status: "in_progress", currentDecider: "P1" });
  });

  it("publishes one onStep per applied CPU action", async () => {
    const step = vi.fn();
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;

    await advanceCpuDecisions(
      active,
      dependencies({
        apply: () => ok({ state: state("P1"), events: [event("onTurnEnd")] }),
        onStep: step,
      }),
    );

    expect(step).toHaveBeenCalledOnce();
    expect(step.mock.calls[0]?.[0]).toMatchObject({
      session: { status: "in_progress", currentDecider: "P1" },
      events: [expect.objectContaining({ type: "onTurnEnd" })],
    });
  });

  it("ends when the engine freezes the duel and preserves the id", async () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    const result = await advanceCpuDecisions(
      active,
      dependencies({
        apply: () => ok({ state: surrenderedState("P2"), events: [] }),
      }),
    );
    expect(result).toMatchObject({ status: "ended", duelSessionId: "session-1" });
  });

  it("reports AI errors, engine refusals, and guards a no-progress loop", async () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    await expect(advanceCpuDecisions(active, dependencies())).resolves.toMatchObject({
      status: "failed",
      reason: "no_progress_loop",
    });
    await expect(
      advanceCpuDecisions(
        active,
        dependencies({ aiAgent: { decide: async () => Promise.reject(new Error("offline")) } }),
      ),
    ).resolves.toMatchObject({ status: "failed", reason: "ai_unavailable" });
    await expect(
      advanceCpuDecisions(
        active,
        dependencies({
          apply: () => err(new DomainError("refused", "reaction_window_open")),
        }),
      ),
    ).resolves.toMatchObject({ status: "failed", reason: "ai_unavailable" });
  });

  it("returns a refusal without changing the session when the engine rejects a player action", async () => {
    const active = createDuelSession(input, createDependencies(state("P1")));
    if (active.status !== "in_progress") return;
    const outcome = await submitPlayerAction(
      active,
      { type: "advance_phase" },
      dependencies({ apply: () => err(new DomainError("illegal", "phase_mismatch")) }),
    );

    expect(outcome.session).toBe(active);
    expect(outcome.events).toEqual([]);
    expect(outcome.refusal?.code).toBe("phase_mismatch");
  });

  it("refuses out-of-turn player actions with not_your_turn", async () => {
    const cpu = createDuelSession(input, createDependencies(state("P2")));
    if (cpu.status !== "in_progress") return;
    const outcome = await submitPlayerAction(cpu, { type: "advance_phase" }, dependencies());

    expect(outcome.session).toBe(cpu);
    expect(outcome.refusal?.code).toBe("not_your_turn");
  });

  it("closes a non-attack reaction window before calculating the next decider", async () => {
    const pending = withPending(state("P1"), "onSummon");
    const active = createDuelSession(input, createDependencies(state("P1")));
    if (active.status !== "in_progress") return;
    const close = vi.fn(closeReactionWindow);

    const outcome = await submitPlayerAction(
      active,
      { type: "advance_phase" },
      dependencies({
        apply: () => ok({ state: pending, events: [event("onSummon")] }),
        closeReactionWindow: close,
      }),
    );

    expect(close).toHaveBeenCalledWith(pending);
    expect(outcome.session).toMatchObject({ status: "in_progress", currentDecider: "P1" });
    if (outcome.session.status === "in_progress") {
      expect(outcome.session.state.pending).toBeUndefined();
    }
    expect(outcome.events).toEqual([expect.objectContaining({ type: "onSummon" })]);
  });

  it("chains resolve_attack after declare_attack and concatenates events", async () => {
    const pending = withPending(state("P1"), "onAttackDeclared");
    const attackResolved = state("P1");
    const apply = vi
      .fn<AdvanceCpuDependencies["apply"]>()
      .mockReturnValueOnce(ok({ state: pending, events: [event("onAttackDeclared")] }))
      .mockReturnValueOnce(ok({ state: attackResolved, events: [event("onDamage")] }));
    const active = createDuelSession(input, createDependencies(state("P1")));
    if (active.status !== "in_progress") return;

    const outcome = await submitPlayerAction(
      active,
      { type: "declare_attack", attackerZoneIndex: 0 },
      dependencies({ apply }),
    );

    expect(apply.mock.calls.map(([, action]: [DuelState, DuelAction]) => action)).toEqual([
      { type: "declare_attack", attackerZoneIndex: 0 },
      { type: "resolve_attack" },
    ]);
    expect(outcome.events.map(({ type }) => type)).toEqual(["onAttackDeclared", "onDamage"]);
  });

  it("returns a refusal when a reaction window cannot be closed", async () => {
    const active = createDuelSession(input, createDependencies(state("P1")));
    if (active.status !== "in_progress") return;
    const outcome = await submitPlayerAction(
      active,
      { type: "advance_phase" },
      dependencies({
        apply: () => ok({ state: withPending(state("P1"), "onSet"), events: [] }),
        closeReactionWindow: () => err(new DomainError("stuck", "no_reaction_window_open")),
      }),
    );

    expect(outcome.session).toBe(active);
    expect(outcome.refusal?.code).toBe("no_reaction_window_open");
  });

  it("allows an interrupt independently of the current decider", () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    expect(
      interruptDuelSession(active, { type: "surrender", player: "P1" }, {
        apply: () => ok({ state: surrenderedState("P1"), events: [] }),
      }),
    ).toMatchObject({ status: "ended" });
  });

  it("keeps an interrupt as a no-op when the engine refuses it", () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    expect(
      interruptDuelSession(active, { type: "surrender", player: "P1" }, {
        apply: () => err(new DomainError("ended", "duel_already_ended")),
      }),
    ).toBe(active);
  });

  it("keeps the session in progress through the end phase of a turn", () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    expect(
      interruptDuelSession(active, { type: "advance_phase" }, {
        apply: () => ok({ state: state("P2", "end"), events: [] }),
      }),
    ).toMatchObject({ status: "in_progress" });
  });
});
