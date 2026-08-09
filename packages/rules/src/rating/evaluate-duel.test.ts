import {
  DUEL_STAT_COUNTERS,
  type Card,
  type DecisiveDuelEndReason,
  type DuelOutcome,
  type DuelStats,
  type DuelState,
  type PlayerField,
  type PlayerState,
  type Snapshot,
} from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { evaluateDuel } from "./evaluate-duel.ts";

function zeroStats(overrides: Partial<DuelStats> = {}): DuelStats {
  return {
    ...(Object.fromEntries(DUEL_STAT_COUNTERS.map((counter) => [counter, 0])) as DuelStats),
    ...overrides,
  };
}

function makeCard(index: number): Card {
  return {
    id: index,
    numero: String(index).padStart(3, "0"),
    nome: `Card ${String(index)}`,
    img: null,
    classe: "Dragon",
    atk: 1000,
    def: 1000,
    guardiao1: "Sun",
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

const emptyZone = { occupied: false } as const;

function emptyField(): PlayerField {
  return {
    monsters: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
    spells: [emptyZone, emptyZone, emptyZone, emptyZone, emptyZone],
  };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { lp: 8000, hand: [], deck: [], field: emptyField(), handPlayUsed: false, ...overrides };
}

const decisiveVictory: DuelOutcome = {
  status: "decisive",
  winner: "P1",
  loser: "P2",
  reason: "lp_depleted",
};

function makeSnapshot(overrides: Partial<DuelState> = {}): Snapshot {
  return {
    players: { P1: makePlayer(), P2: makePlayer() },
    activeField: null,
    activePlayer: "P1",
    turn: 10,
    phase: "end",
    seed: 1,
    stats: { P1: zeroStats(), P2: zeroStats() },
    outcome: decisiveVictory,
    ...overrides,
  };
}

/** A fast, aggressive win: few turns, few cards used, full life and deck. */
function swiftVictorySnapshot(): Snapshot {
  return makeSnapshot({
    turn: 3,
    players: {
      P1: makePlayer({ lp: 8000, deck: Array.from({ length: 35 }, (_, i) => makeCard(i + 1)) }),
      P2: makePlayer({ lp: 0 }),
    },
    stats: { P1: zeroStats({ effectiveAttacks: 1 }), P2: zeroStats() },
  });
}

/** A long, technical win: many turns, many fusions and magics, thin deck. */
function technicalVictorySnapshot(): Snapshot {
  return makeSnapshot({
    turn: 40,
    players: {
      P1: makePlayer({ lp: 200, deck: [makeCard(1), makeCard(2)] }),
      P2: makePlayer({ lp: 0 }),
    },
    stats: {
      P1: zeroStats({ fusions: 16, equips: 16, pureMagics: 12, faceDownPlays: 32, effectiveAttacks: 25 }),
      P2: zeroStats(),
    },
  });
}

describe("evaluateDuel — the happy path", () => {
  it("returns a grade and a reward for the winning player", () => {
    const result = evaluateDuel(makeSnapshot(), "P1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.grade).toBeTruthy();
    expect(result.value.reward.stars).toBeGreaterThanOrEqual(1);
  });

  it("grades a swift, aggressive win into the POW band", () => {
    const result = evaluateDuel(swiftVictorySnapshot(), "P1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.grade).toMatch(/-POW$/);
    expect(result.value.reward.dropTier).toBe("sa-pow");
  });

  it("grades a long win carried by fusions and magics into the TEC band", () => {
    const result = evaluateDuel(technicalVictorySnapshot(), "P1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.grade).toMatch(/-TEC$/);
    expect(result.value.reward.dropTier).toBe("sa-tec");
  });

  it("reads the counters of the evaluated player and not of the opponent", () => {
    const lopsided = makeSnapshot({
      stats: { P1: zeroStats(), P2: zeroStats({ fusions: 40, pureMagics: 40 }) },
    });

    expect(evaluateDuel(lopsided, "P1")).toEqual(evaluateDuel(makeSnapshot(), "P1"));
  });

  it("scores a deck-out win below the same duel won by annihilation", () => {
    const byAnnihilation = evaluateDuel(makeSnapshot(), "P1");
    const byDeckOut = evaluateDuel(
      makeSnapshot({ outcome: { ...decisiveVictory, reason: "deck_out" } }),
      "P1",
    );

    expect(byAnnihilation.ok && byDeckOut.ok).toBe(true);
    if (!byAnnihilation.ok || !byDeckOut.ok) return;
    expect(byDeckOut.value.reward.stars).not.toBe(byAnnihilation.value.reward.stars);
    expect(byDeckOut.value.grade).not.toBe(byAnnihilation.value.grade);
  });
});

describe("evaluateDuel — refusals", () => {
  it("returns duel_outcome_missing when the snapshot has no outcome", () => {
    const running = makeSnapshot();
    const withoutOutcome = Object.fromEntries(
      Object.entries(running).filter(([key]) => key !== "outcome"),
    ) as Snapshot;

    const result = evaluateDuel(withoutOutcome, "P1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duel_outcome_missing");
  });

  it("returns duel_not_won_by_player for a draw", () => {
    const drawn = makeSnapshot({
      outcome: { status: "draw", winner: null, loser: null, reason: "draw" },
    });

    const result = evaluateDuel(drawn, "P1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duel_not_won_by_player");
  });

  it("returns duel_not_won_by_player when the evaluated player lost", () => {
    const result = evaluateDuel(makeSnapshot(), "P2");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duel_not_won_by_player");
  });

  it("returns unscorable_duel_end_reason for a surrender win", () => {
    const conceded = makeSnapshot({ outcome: { ...decisiveVictory, reason: "surrender" } });

    const result = evaluateDuel(conceded, "P1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unscorable_duel_end_reason");
  });

  it("returns duel_stats_missing when the snapshot carries no stats", () => {
    const legacy = makeSnapshot();
    const withoutStats = { ...legacy, stats: {} } as unknown as Snapshot;

    const result = evaluateDuel(withoutStats, "P1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duel_stats_missing");
  });

  it("never assumes zeroed counters for a snapshot without stats", () => {
    const withoutStats = { ...makeSnapshot(), stats: {} } as unknown as Snapshot;

    // Zeroed counters would grade this near-perfect duel as a top reward; the
    // refusal above is what stops a silent maximum payout.
    expect(evaluateDuel(withoutStats, "P1").ok).toBe(false);
  });
});

describe("evaluateDuel — win-type mapping", () => {
  const reasons: readonly (readonly [DecisiveDuelEndReason, boolean])[] = [
    ["lp_depleted", true],
    ["deck_out", true],
    ["surrender", false],
  ];

  it.each(reasons)("scores a %s win: %s", (reason, scorable) => {
    const result = evaluateDuel(makeSnapshot({ outcome: { ...decisiveVictory, reason } }), "P1");

    expect(result.ok).toBe(scorable);
  });
});
