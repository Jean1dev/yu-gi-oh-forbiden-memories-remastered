import {
  DomainError,
  err,
  ok,
  type AiAgent,
  type Card,
  type DuelState,
  type MatchOrchestrationInput,
} from "@yugioh/shared";
import { getPublicDuelState } from "@yugioh/rules";
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

function createDependencies(initialState: DuelState, reject = false) {
  return {
    buildInitializationInput: () =>
      reject
        ? err(new DomainError("invalid", "invalid_deck"))
        : ok({ players: { P1: { cards: [] }, P2: { cards: [] } }, seed: 1 }),
    initDuel: () => initialState,
    seedGenerator: () => 1,
    catalog: (): Card | undefined => undefined,
    validateDeck: {},
    generateSessionId: () => "session-1",
  };
}

const ai: AiAgent = { decide: async () => ({ type: "advance_phase" }) };
const profile = { strategy: "test", parameters: {} };

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
    expect(
      nextDecider({
        ...state("P1"),
        pending: {
          type: "reaction_window",
          reactingPlayer: "P2",
          event: {
            type: "onDraw",
            originPlayer: "P1",
            involvedCards: [],
            involvedZones: [],
            context: {},
          },
        },
      }),
    ).toBe("P2");
  });

  it("advances CPU actions until control returns to P1", async () => {
    const apply = vi.fn(() => ({ state: state("P1"), events: [] }));
    const active = createDuelSession(input, createDependencies(state("P2")));
    expect(active.status).toBe("in_progress");
    if (active.status !== "in_progress") return;
    const result = await advanceCpuDecisions(active, {
      apply,
      aiAgent: ai,
      getPublicDuelState,
      cpuProfile: profile,
    });
    expect(apply).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ status: "in_progress", currentDecider: "P1" });
  });

  it("ends when the engine freezes the duel and preserves the id", async () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    const result = await advanceCpuDecisions(active, {
      apply: () => ({ state: surrenderedState("P2"), events: [] }),
      aiAgent: ai,
      getPublicDuelState,
      cpuProfile: profile,
    });
    expect(result).toMatchObject({ status: "ended", duelSessionId: "session-1" });
  });

  it("reports AI errors and guards a no-progress loop", async () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    const base: AdvanceCpuDependencies = {
      apply: (current) => ({ state: current, events: [] }),
      aiAgent: ai,
      getPublicDuelState,
      cpuProfile: profile,
    };
    await expect(advanceCpuDecisions(active, base)).resolves.toMatchObject({
      status: "failed",
      reason: "no_progress_loop",
    });
    await expect(
      advanceCpuDecisions(active, {
        ...base,
        aiAgent: { decide: async () => Promise.reject(new Error("offline")) },
      }),
    ).resolves.toMatchObject({ status: "failed", reason: "ai_unavailable" });
  });

  it("ignores an out-of-turn player action and advances after a valid one", async () => {
    const cpu = createDuelSession(input, createDependencies(state("P2")));
    const player = createDuelSession(input, createDependencies(state("P1")));
    if (cpu.status !== "in_progress" || player.status !== "in_progress") return;
    const dependencies: AdvanceCpuDependencies = {
      apply: () => ({ state: state("P1"), events: [] }),
      aiAgent: ai,
      getPublicDuelState,
      cpuProfile: profile,
    };
    await expect(submitPlayerAction(cpu, { type: "advance_phase" }, dependencies)).resolves.toBe(cpu);
    await expect(submitPlayerAction(player, { type: "advance_phase" }, dependencies)).resolves.toMatchObject({
      status: "in_progress",
      currentDecider: "P1",
    });
  });

  it("allows an interrupt independently of the current decider", () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    expect(
      interruptDuelSession(
        active,
        { type: "surrender", player: "P1" },
        {
          apply: () => ({ state: surrenderedState("P1"), events: [] }),
        },
      ),
    ).toMatchObject({ status: "ended" });
  });

  it("keeps the session in progress through the end phase of a turn", () => {
    const active = createDuelSession(input, createDependencies(state("P2")));
    if (active.status !== "in_progress") return;
    expect(
      interruptDuelSession(
        active,
        { type: "advance_phase" },
        {
          apply: () => ({ state: state("P2", "end"), events: [] }),
        },
      ),
    ).toMatchObject({ status: "in_progress" });
  });
});
