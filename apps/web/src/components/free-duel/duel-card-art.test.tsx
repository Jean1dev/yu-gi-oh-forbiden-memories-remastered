// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CARD_BACK_URL } from "../../lib/card-art-url.ts";
import { DuelCardArt } from "./duel-card-art.tsx";

describe("DuelCardArt", () => {
  it("renders the card back for a face-down card", () => {
    render(<DuelCardArt hidden label="Carta virada" />);

    const back = screen.getByRole("img", { name: "Carta virada" });
    expect(back.getAttribute("src")).toBe(CARD_BACK_URL);
  });

  it("falls back to the woven pattern when the card back fails to load", () => {
    render(<DuelCardArt hidden label="Carta virada" />);

    fireEvent.error(screen.getByRole("img", { name: "Carta virada" }));

    const fallback = screen.getByRole("img", { name: "Carta virada" });
    expect(fallback.tagName).toBe("SPAN");
  });

  it("renders the art of a visible card", () => {
    render(<DuelCardArt cardNumber="001" label="Blue Dragon" />);

    expect(screen.getByRole("img", { name: "Blue Dragon" }).getAttribute("src")).toBe(
      "/cards-data/001.jpg",
    );
  });

  it("falls back to the placeholder when the art fails to load", () => {
    render(<DuelCardArt cardNumber="001" label="Blue Dragon" />);

    fireEvent.error(screen.getByRole("img", { name: "Blue Dragon" }));

    expect(screen.getByRole("img", { name: "Blue Dragon" }).tagName).toBe("SPAN");
  });
});
