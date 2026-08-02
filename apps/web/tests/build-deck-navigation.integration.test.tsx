// @vitest-environment jsdom
import type { Card } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BuildDeckClient } from "../src/app/build-deck/build-deck-client.tsx";
import type { UseActiveDeckPersistenceResult } from "../src/hooks/use-active-deck-persistence.ts";
import { useActiveDeckPersistence } from "../src/hooks/use-active-deck-persistence.ts";
import { useActiveDeckSync } from "../src/hooks/use-active-deck-sync.ts";
import type { CollectionState } from "../src/hooks/use-collection.ts";
import { useCollection } from "../src/hooks/use-collection.ts";
import { useDeckDraftStore } from "../src/stores/deck-draft-store.ts";

vi.mock("../src/hooks/use-collection.ts", () => ({
  useCollection: vi.fn(),
}));
vi.mock("../src/hooks/use-active-deck-persistence.ts", () => ({
  useActiveDeckPersistence: vi.fn(),
}));
vi.mock("../src/hooks/use-active-deck-sync.ts", () => ({
  useActiveDeckSync: vi.fn(),
}));

const mockedUseCollection = vi.mocked(useCollection);
const mockedUseActiveDeckPersistence = vi.mocked(useActiveDeckPersistence);
const mockedUseActiveDeckSync = vi.mocked(useActiveDeckSync);

function card(overrides: Partial<Card>): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: null,
    estrelas: 999_999,
    tipo: "monstro",
    ...overrides,
  };
}

const DRAGON = card({ numero: "001", nome: "Blue-eyes White Dragon", classe: "Dragon" });
const WARRIOR = card({
  numero: "002",
  nome: "Celtic Guardian",
  classe: "Warrior",
  atk: 1400,
  def: 1200,
  guardiao1: "Moon",
  guardiao2: "Venus",
  estrelas: 300,
});
const SPELL = card({
  numero: "003",
  nome: "Dark Hole",
  classe: "Magic",
  atk: null,
  def: null,
  guardiao1: null,
  guardiao2: null,
  estrelas: null,
  tipo: "magica",
});
const CARD_NAMES = new Set([DRAGON.nome, WARRIOR.nome, SPELL.nome]);

beforeEach(() => {
  useDeckDraftStore.setState({
    originalActiveDeck: new Map(),
    draft: new Map(),
    lastBlock: undefined,
  });
  mockedUseCollection.mockReturnValue({
    status: "ready",
    loaded: {
      origin: "server",
      collection: new Map([
        ["001", 2],
        ["002", 3],
        ["003", 1],
      ]),
      syncedAt: "2026-08-01T00:00:00.000Z",
    },
  } as CollectionState);
  mockedUseActiveDeckPersistence.mockReturnValue({
    state: { status: "ready", activeDeck: new Map(), conflictDetected: false },
    saveStatus: { kind: "idle" },
    save: vi.fn(),
  } as UseActiveDeckPersistenceResult);
  mockedUseActiveDeckSync.mockReturnValue(undefined);
});

function collectionCardNames(): string[] {
  return screen
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label"))
    .filter((label): label is string => label !== null && CARD_NAMES.has(label));
}

describe("build-deck/F04 navigation full-scope controls", () => {
  it("combines type, class and guardian filters over owned cards", () => {
    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON, WARRIOR, SPELL] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Monstro" }));
    fireEvent.change(screen.getByLabelText("Classe"), { target: { value: "Warrior" } });
    fireEvent.change(screen.getByLabelText("Guardião"), { target: { value: "Moon" } });

    expect(collectionCardNames()).toEqual(["Celtic Guardian"]);
    expect(screen.queryByRole("button", { name: "Blue-eyes White Dragon" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dark Hole" })).toBeNull();
  });

  it("sorts the collection by owned quantity and can reverse direction", () => {
    render(<BuildDeckClient catalogResult={{ status: "ok", cards: [DRAGON, WARRIOR, SPELL] }} />);

    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "quantity" } });

    expect(collectionCardNames()).toEqual([
      "Dark Hole",
      "Blue-eyes White Dragon",
      "Celtic Guardian",
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Ordem crescente; mudar para decrescente" }),
    );

    expect(collectionCardNames()).toEqual([
      "Celtic Guardian",
      "Blue-eyes White Dragon",
      "Dark Hole",
    ]);
  });
});
