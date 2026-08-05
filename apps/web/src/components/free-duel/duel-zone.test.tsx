// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { Card, PublicMonsterZone, PublicSpellZone, ZoneReference } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { DuelZone } from "./duel-zone.tsx";

const card: Card = {
  id: 1,
  numero: "001",
  nome: "Blue Dragon",
  img: null,
  classe: "Dragon",
  atk: 1200,
  def: 900,
  guardiao1: "Sun",
  guardiao2: "Moon",
  password: null,
  estrelas: null,
  tipo: "monstro",
};

const reference: ZoneReference = { player: "P1", zoneType: "monster", index: 0 };

describe("DuelZone", () => {
  it("shows distinct empty labels for monster and backrow zones", () => {
    render(
      <>
        <DuelZone
          zone={{ occupied: false } satisfies PublicMonsterZone}
          reference={reference}
          label="Zona de monstro Jogador 1"
          emptyLabel="Vazio"
          affordance="idle"
        />
        <DuelZone
          zone={{ occupied: false } satisfies PublicSpellZone}
          reference={{ ...reference, zoneType: "spell" }}
          label="Zona de magia/armadilha Jogador 1"
          emptyLabel="-"
          affordance="idle"
        />
      </>,
    );

    expect(screen.getByRole("button", { name: /Zona de monstro Jogador 1, Vazio/ })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Zona de magia\/armadilha Jogador 1, -/ }),
    ).toBeTruthy();
  });

  it("shows visible monster stats and never exposes hidden opponent card data", () => {
    const visible: PublicMonsterZone = {
      occupied: true,
      card: { visible: true, card },
      position: "attack_face_up",
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    };
    const hidden: PublicMonsterZone = { ...visible, card: { visible: false } };

    const { rerender } = render(
      <DuelZone
        zone={visible}
        reference={reference}
        label="Zona de monstro Jogador 1"
        emptyLabel="Vazio"
        affordance="idle"
      />,
    );
    expect(screen.getByText("1200 / 900")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Blue Dragon/ })).toBeTruthy();

    rerender(
      <DuelZone
        zone={hidden}
        reference={{ ...reference, player: "P2" }}
        label="Zona de monstro Oponente 1"
        emptyLabel="Vazio"
        affordance="idle"
      />,
    );
    expect(screen.queryByText("Blue Dragon")).toBeNull();
    expect(screen.queryByText("1200 / 900")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Zona de monstro Oponente 1, Carta virada" }),
    ).toBeTruthy();
  });

  it("uses disabled state and data-affordance from props", () => {
    const onActivate = vi.fn();
    const { rerender } = render(
      <DuelZone
        zone={{ occupied: false }}
        reference={reference}
        label="Zona de monstro Jogador 1"
        emptyLabel="Vazio"
        affordance="idle"
      />,
    );
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);

    rerender(
      <DuelZone
        zone={{ occupied: false }}
        reference={reference}
        label="Zona de monstro Jogador 1"
        emptyLabel="Vazio"
        affordance="selectable"
        onActivate={onActivate}
      />,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("data-affordance")).toBe("selectable");
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("renders CardFrame (compact) instead of the legacy image when the card is migrated", () => {
    const migratedCard: Card = { ...card, descricao: "A powerful dragon." };
    const zone = {
      occupied: true,
      card: { visible: true, card: migratedCard },
      position: "attack_face_up",
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    } as unknown as PublicMonsterZone;

    render(
      <DuelZone
        zone={zone}
        reference={reference}
        label="Zona de monstro Jogador 1"
        emptyLabel="Vazio"
        affordance="idle"
      />,
    );

    expect(screen.getByText("ATK 1200 / DEF 900")).toBeTruthy();
  });

  it("keeps rendering the legacy image for a card without descricao (regression fallback)", () => {
    const zone = {
      occupied: true,
      card: { visible: true, card },
      position: "attack_face_up",
      hasAttacked: false,
      hasChangedPosition: false,
      equips: [],
    } as unknown as PublicMonsterZone;

    render(
      <DuelZone
        zone={zone}
        reference={reference}
        label="Zona de monstro Jogador 1"
        emptyLabel="Vazio"
        affordance="idle"
      />,
    );

    expect(screen.queryByText("ATK 1200 / DEF 900")).toBeNull();
    expect(screen.getByText("1200 / 900")).toBeTruthy();
  });
});
