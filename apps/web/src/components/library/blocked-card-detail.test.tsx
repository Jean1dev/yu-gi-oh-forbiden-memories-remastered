// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BlockedCardDetail } from "./blocked-card-detail.tsx";

describe("BlockedCardDetail", () => {
  it("shows only silhouette, card number, blocked message and return action", () => {
    const { container } = render(
      <BlockedCardDetail
        cardNumber="380"
        art={{ kind: "silhouette" }}
        returnDestination="/library?status=nao-obtidas"
      />,
    );

    expect(screen.getByTestId("card-art-silhouette")).toBeTruthy();
    expect(screen.getByText("#380")).toBeTruthy();
    expect(screen.getByText("Carta ainda não obtida")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voltar para a Library" }).getAttribute("href")).toBe(
      "/library?status=nao-obtidas",
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(
      /Blue-Eyes|Dragon|monstro|ATK|DEF|Guardião|89 63 14 30|Estrelas|999999/,
    );
  });
});
