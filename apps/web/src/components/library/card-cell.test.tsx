// @vitest-environment jsdom
import type { Card, LibraryEntry } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardCell } from "./card-cell.tsx";

const CARD: Card = {
  id: 1,
  numero: "001",
  nome: "Blue-Eyes White Dragon",
  img: null,
  classe: "Dragon",
  atk: 3000,
  def: 2500,
  guardiao1: null,
  guardiao2: null,
  password: "89 63 14 30",
  estrelas: 12,
  tipo: "monstro",
};

const OBTAINED_ENTRY: LibraryEntry = {
  obtained: true,
  cardNumber: "001",
  card: CARD,
  art: { kind: "art", path: "/cards-data/001.jpg" },
};

const BLOCKED_ENTRY: LibraryEntry = {
  obtained: false,
  cardNumber: "042",
  art: { kind: "silhouette" },
};

describe("CardCell", () => {
  it("shows art, name and number for an obtained card", () => {
    render(<CardCell entry={OBTAINED_ENTRY} />);

    expect(screen.getByText("Blue-Eyes White Dragon")).toBeTruthy();
    expect(screen.getByText("001")).toBeTruthy();
  });

  it("shows the type and class label for an obtained card", () => {
    render(<CardCell entry={OBTAINED_ENTRY} />);

    expect(screen.getByText("monstro · Dragon")).toBeTruthy();
  });

  it("shows silhouette, number and question marks for a blocked card", () => {
    render(<CardCell entry={BLOCKED_ENTRY} />);

    expect(screen.getByTestId("card-art-silhouette")).toBeTruthy();
    expect(screen.getByText("042")).toBeTruthy();
    expect(screen.getByText("???")).toBeTruthy();
  });

  it("never exposes the blocked card's name anywhere in the tree", () => {
    render(<CardCell entry={BLOCKED_ENTRY} />);

    expect(screen.queryByText("Blue-Eyes White Dragon")).toBeNull();
  });

  it("never exposes type, class, atk, def, guardian, password or stars of a blocked card", () => {
    const { container } = render(<CardCell entry={BLOCKED_ENTRY} />);

    const text = container.textContent ?? "";
    expect(text).not.toContain("Dragon");
    expect(text).not.toContain("monstro");
    expect(text).not.toContain("3000");
    expect(text).not.toContain("2500");
    expect(text).not.toContain("89 63 14 30");
    expect(text).not.toContain("12");
  });

  it("points to the detail route of the obtained card's number", () => {
    render(<CardCell entry={OBTAINED_ENTRY} />);

    expect(screen.getByRole("link").getAttribute("href")).toBe("/library/001");
  });

  it("also points to the detail route when the card is blocked", () => {
    render(<CardCell entry={BLOCKED_ENTRY} />);

    expect(screen.getByRole("link").getAttribute("href")).toBe("/library/042");
  });

  it("preserves search and future filter parameters in the detail link", () => {
    render(
      <CardCell entry={OBTAINED_ENTRY} detailQueryString="q=dragon&status=all&type=monster" />,
    );

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/library/001?q=dragon&status=all&type=monster",
    );
  });

  it("uses the placeholder when the art reference is placeholder", () => {
    const entry: LibraryEntry = {
      ...OBTAINED_ENTRY,
      art: { kind: "placeholder" },
    };
    render(<CardCell entry={entry} />);

    expect(screen.getByTestId("card-art-placeholder")).toBeTruthy();
  });

  it("falls back to the placeholder when the image fires a load error", () => {
    render(<CardCell entry={OBTAINED_ENTRY} />);

    const img = screen.getByRole("img", { name: "Blue-Eyes White Dragon" });
    fireEvent.error(img);

    expect(screen.getByTestId("card-art-placeholder")).toBeTruthy();
  });

  it("announces name, number and type in the obtained card's accessible name", () => {
    render(<CardCell entry={OBTAINED_ENTRY} />);

    expect(
      screen.getByRole("link", { name: "Blue-Eyes White Dragon, número 001, monstro" }),
    ).toBeTruthy();
  });

  it("announces only the number and the not-obtained condition in the blocked card's accessible name", () => {
    render(<CardCell entry={BLOCKED_ENTRY} />);

    expect(screen.getByRole("link", { name: "Carta 042, ainda não obtida" })).toBeTruthy();
  });

  it("never shows a copy count", () => {
    const { container } = render(<CardCell entry={OBTAINED_ENTRY} />);

    expect(container.textContent ?? "").not.toMatch(/possui \d/i);
  });
});
