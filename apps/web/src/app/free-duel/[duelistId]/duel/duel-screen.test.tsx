// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DomainError,
  err,
  ok,
  type Card,
  type DuelEvent,
  type DropPool,
  type DuelSession,
  type DuelState,
  type Duelist,
  type ReadyDeck,
  type ZoneReference,
} from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import type { DuelRuntime } from "../../../../lib/free-duel/duel-runtime.ts";
import { DuelScreen, type DuelScreenContext } from "./duel-screen.tsx";
import { emptyDuelStatsByPlayer } from "@yugioh/engine";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

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
const card: Card = {
  id: 1,
  numero: "001",
  nome: "Blue Dragon",
  img: null,
  classe: "Dragon",
  atk: 1000,
  def: 1000,
  guardiao1: null,
  guardiao2: null,
  password: null,
  estrelas: null,
  tipo: "monstro",
};
const spell: Card = {
  ...card,
  id: 2,
  numero: "002",
  nome: "Magic Card",
  atk: null,
  def: null,
  tipo: "magica",
};
const state: DuelState = {
  players: {
    P1: { lp: 8000, hand: [card], deck: [], field, handPlayUsed: false },
    P2: { lp: 7500, hand: [], deck: [], field, handPlayUsed: false },
  },
  activeField: null,
  activePlayer: "P1",
  turn: 1,
  phase: "main",
  seed: 1,
  stats: emptyDuelStatsByPlayer(),
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
const playerDeck: ReadyDeck = { composition: {}, cardNumbers: [], total: 40 };
const context: DuelScreenContext = { duelist, playerDeck };
const loadContext = async () => context;

function withHand(base: DuelState, hand: readonly Card[]): DuelState {
  return {
    ...base,
    players: { ...base.players, P1: { ...base.players.P1, hand } },
  };
}

function withMonster(base: DuelState, reference: ZoneReference): DuelState {
  const player = base.players[reference.player];
  const monsters = player.field.monsters.map((zone, index) =>
    index === reference.index
      ? {
          occupied: true as const,
          card,
          position: "attack_face_up" as const,
          hasAttacked: false,
          hasChangedPosition: false,
          equips: [],
        }
      : zone,
  ) as unknown as typeof player.field.monsters;
  return {
    ...base,
    players: {
      ...base.players,
      [reference.player]: { ...player, field: { ...player.field, monsters } },
    },
  };
}

function createRuntimeHarness(initialState: DuelState, applyImpl?: DuelRuntime["applyAction"]) {
  const session: DuelSession = {
    status: "in_progress",
    duelSessionId: "session-1",
    duelistId: "seto",
    state: initialState,
    currentDecider: "P1",
  };
  const apply = vi.fn(applyImpl ?? ((current) => ok({ state: current, events: [] })));
  const runtime = {
    start: vi.fn(() => session),
    applyAction: apply,
    advanceDependencies: {
      apply,
      closeReactionWindow: vi.fn((current: DuelState) => ok(current)),
      aiAgent: { decide: vi.fn() },
      getPublicDuelState: vi.fn(),
    },
    resolveResult: vi.fn(),
  } as unknown as DuelRuntime;
  return { apply, runtime };
}

function summonEvent(): DuelEvent {
  return {
    type: "onSummon",
    originPlayer: "P1",
    involvedCards: [card],
    involvedZones: [{ player: "P1", zoneType: "monster", index: 0 }],
    context: {},
  };
}

describe("DuelScreen", () => {
  it("renders both 5+5 fields, life points and the player hand", async () => {
    const session: DuelSession = {
      status: "in_progress",
      duelSessionId: "session-1",
      duelistId: "seto",
      state,
      currentDecider: "P1",
    };
    render(<DuelScreen duelistId="seto" loadContext={loadContext} startMatch={() => session} />);
    expect(await screen.findByRole("heading", { name: "Duelo" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Zona de monstro/ })).toHaveLength(10);
    expect(screen.getAllByRole("button", { name: /Zona de magia\/armadilha/ })).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Blue Dragon" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByText("7500 LP")).toBeTruthy();
  });

  it("disables the hand while the CPU decides", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "in_progress",
          duelSessionId: "session-1",
          duelistId: "seto",
          state: { ...state, activePlayer: "P2" },
          currentDecider: "P2",
        })}
      />,
    );
    expect(
      (await screen.findByRole("button", { name: "Blue Dragon" })).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows the PRD failure message and menu action", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "failed",
          duelSessionId: "session-1",
          duelistId: "seto",
          reason: "deck_rejected_by_engine",
        })}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/deck inválido/i);
    expect(screen.getByRole("link", { name: "Voltar ao menu" }).getAttribute("href")).toBe(
      "/free-duel",
    );
  });

  it("redirects direct navigation without a handoff", async () => {
    replace.mockReset();
    render(<DuelScreen duelistId="missing" loadContext={async () => null} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/free-duel"));
  });

  it("renders the consolidated result for an ended duel", async () => {
    const session: DuelSession = {
      status: "ended",
      duelSessionId: "session-1",
      duelistId: "seto",
      finalState: { ...state, phase: "end" },
    };
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => session}
        resolveResult={async () => ({
          status: "defeat",
          duelSessionId: "session-1",
          reason: "surrender",
        })}
      />,
    );
    expect(await screen.findByRole("heading", { name: "Derrota" })).toBeTruthy();
    expect(screen.getByText("Você se rendeu.")).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
    expect(screen.getByRole("link", { name: "Revanche" }).getAttribute("href")).toBe(
      "/free-duel/seto/prepare",
    );
    expect(screen.getByRole("link", { name: "Trocar oponente" }).getAttribute("href")).toBe(
      "/free-duel",
    );
    expect(screen.getByRole("link", { name: "Voltar ao menu" }).getAttribute("href")).toBe("/");
  });

  it("does not render post-duel actions while the session is in progress", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "in_progress",
          duelSessionId: "session-1",
          duelistId: "seto",
          state,
          currentDecider: "P1",
        })}
      />,
    );
    await screen.findByRole("heading", { name: "Duelo" });
    expect(screen.queryByRole("link", { name: "Revanche" })).toBeNull();
  });

  it("shows a catalog-unavailable notice without starting the match", () => {
    const loadContext = vi.fn(async () => context);
    const startMatch = vi.fn();

    render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "error" }}
        loadContext={loadContext}
        startMatch={startMatch}
      />,
    );

    expect(screen.getByRole("heading", { name: "Duelo indisponível" })).toBeTruthy();
    expect(loadContext).not.toHaveBeenCalled();
    expect(startMatch).not.toHaveBeenCalled();
  });

  it("dispatches advance_phase from the fixed action slot", async () => {
    const { apply, runtime } = createRuntimeHarness(state, () =>
      ok({ state: { ...state, phase: "battle" }, events: [] }),
    );

    render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "ready", cards: [card] }}
        loadContext={loadContext}
        createRuntime={() => runtime}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Passar Fase" }));

    await waitFor(() => expect(apply).toHaveBeenCalledWith(state, { type: "advance_phase" }));
  });

  it("feeds runtime events into visual cues", async () => {
    const { runtime } = createRuntimeHarness(state, () => ok({ state, events: [summonEvent()] }));
    render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "ready", cards: [card] }}
        loadContext={loadContext}
        createRuntime={() => runtime}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Passar Fase" }));

    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Zona de monstro Jogador 1, Vazio" })
          .getAttribute("data-cue"),
      ).toBe("place"),
    );
    expect(screen.getByRole("button", { name: "Blue Dragon" }).hasAttribute("disabled")).toBe(true);
  });

  it("dispatches summon_monster after choosing card, zone and position", async () => {
    const { apply, runtime } = createRuntimeHarness(state);
    render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "ready", cards: [card] }}
        loadContext={loadContext}
        createRuntime={() => runtime}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Blue Dragon" }));
    fireEvent.click(screen.getByRole("button", { name: "Invocar" }));
    fireEvent.click(screen.getByRole("button", { name: "Zona de monstro Jogador 1, Vazio" }));
    fireEvent.click(screen.getByRole("button", { name: "Ataque" }));

    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith(state, {
        type: "summon_monster",
        player: "P1",
        handIndex: 0,
        zoneIndex: 0,
        position: "attack_face_up",
      }),
    );
  });

  it("dispatches play_spell_or_trap from a selected spell card", async () => {
    const spellState = withHand(state, [spell]);
    const { apply, runtime } = createRuntimeHarness(spellState);
    render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "ready", cards: [spell] }}
        loadContext={loadContext}
        createRuntime={() => runtime}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Magic Card" }));
    fireEvent.click(screen.getByRole("button", { name: "Colocar" }));
    fireEvent.click(screen.getByRole("button", { name: "Zona de magia/armadilha Jogador 1, -" }));

    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith(spellState, {
        type: "play_spell_or_trap",
        handIndex: 0,
        zoneIndex: 0,
      }),
    );
  });

  it("dispatches targeted and direct attacks", async () => {
    const battleState = withHand(
      withMonster(
        withMonster(
          { ...state, phase: "battle", turn: 2 },
          { player: "P1", zoneType: "monster", index: 0 },
        ),
        { player: "P2", zoneType: "monster", index: 0 },
      ),
      [],
    );
    const { apply, runtime } = createRuntimeHarness(battleState);
    const rendered = render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "ready", cards: [card] }}
        loadContext={loadContext}
        createRuntime={() => runtime}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Atacar" }));
    fireEvent.click(screen.getByRole("button", { name: "Zona de monstro Jogador 1, Blue Dragon" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Zona de monstro Oponente 1, Blue Dragon" }),
    );
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith(battleState, {
        type: "declare_attack",
        attackerZoneIndex: 0,
        targetZoneIndex: 0,
      }),
    );
    rendered.unmount();

    const directState = withHand(
      withMonster(
        { ...state, phase: "battle", turn: 2 },
        { player: "P1", zoneType: "monster", index: 0 },
      ),
      [],
    );
    const directHarness = createRuntimeHarness(directState);
    render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "ready", cards: [card] }}
        loadContext={loadContext}
        createRuntime={() => directHarness.runtime}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Atacar" }));
    fireEvent.click(screen.getByRole("button", { name: "Zona de monstro Jogador 1, Blue Dragon" }));
    fireEvent.click(screen.getByRole("button", { name: "Ataque Direto" }));
    await waitFor(() =>
      expect(directHarness.apply).toHaveBeenCalledWith(directState, {
        type: "declare_attack",
        attackerZoneIndex: 0,
      }),
    );
  });

  it("dispatches change_position and translates engine refusals", async () => {
    const battleState = withHand(
      withMonster(
        { ...state, phase: "battle", turn: 2 },
        { player: "P1", zoneType: "monster", index: 0 },
      ),
      [],
    );
    const { apply, runtime } = createRuntimeHarness(battleState, () =>
      err(new DomainError("engine text", "hand_play_already_used")),
    );
    render(
      <DuelScreen
        duelistId="seto"
        catalogResult={{ status: "ready", cards: [card] }}
        loadContext={loadContext}
        createRuntime={() => runtime}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Mudar Posicao" }));
    fireEvent.click(screen.getByRole("button", { name: "Zona de monstro Jogador 1, Blue Dragon" }));

    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith(battleState, {
        type: "change_position",
        zone: { player: "P1", zoneType: "monster", index: 0 },
      }),
    );
    expect((await screen.findByRole("status")).textContent).toBe(
      "Voce ja usou uma carta da mao neste turno.",
    );
  });

  it("does not render post-duel actions when orchestration failed", async () => {
    render(
      <DuelScreen
        duelistId="seto"
        loadContext={loadContext}
        startMatch={() => ({
          status: "failed",
          duelSessionId: "session-1",
          duelistId: "seto",
          reason: "ai_unavailable",
        })}
      />,
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: "Revanche" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Trocar oponente" })).toBeNull();
  });

  it("fails safely when result contracts are not composed", async () => {
    const session: DuelSession = {
      status: "ended",
      duelSessionId: "session-1",
      duelistId: "seto",
      finalState: { ...state, phase: "end" },
    };
    render(<DuelScreen duelistId="seto" loadContext={loadContext} startMatch={() => session} />);
    expect(await screen.findByRole("heading", { name: "Resultado indisponível" })).toBeTruthy();
    expect(screen.queryByText(/estrelas/)).toBeNull();
  });

  it("passes the loaded duelist's dropPool to grantVictoryReward on a victory result", async () => {
    const dropPool: DropPool = [{ tier: "common", cardNumbers: ["001"] }];
    const contextWithDropPool: DuelScreenContext = {
      duelist: { ...duelist, dropPool },
      playerDeck,
    };
    const session: DuelSession = {
      status: "ended",
      duelSessionId: "session-1",
      duelistId: "seto",
      finalState: { ...state, phase: "end" },
    };
    const grantVictoryReward = vi.fn(async () =>
      ok({
        outcome: { cardNumber: "001" as const, source: "duelist_pool" as const, tier: "common" },
        reward: { status: "applied" as const, cardQuantity: 1, walletStars: 10 },
      }),
    );

    render(
      <DuelScreen
        duelistId="seto"
        loadContext={async () => contextWithDropPool}
        startMatch={() => session}
        resolveResult={async () => ({
          status: "victory",
          duelSessionId: "session-1",
          reason: "lp_depleted",
          rating: {
            source: "rating_engine",
            grade: "A",
            reward: { stars: 10, dropTier: "common" },
          },
        })}
        grantVictoryReward={grantVictoryReward}
      />,
    );

    await waitFor(() => expect(grantVictoryReward).toHaveBeenCalledTimes(1));
    expect(grantVictoryReward).toHaveBeenCalledWith(expect.anything(), dropPool);
  });
});
