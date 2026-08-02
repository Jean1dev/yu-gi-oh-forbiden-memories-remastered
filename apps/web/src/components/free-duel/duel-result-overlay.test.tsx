// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DuelResultOverlay } from "./duel-result-overlay.tsx";

describe("DuelResultOverlay", () => {
  it("frames the duel result content in a labelled overlay", () => {
    render(
      <DuelResultOverlay>
        <h2>Derrota</h2>
      </DuelResultOverlay>,
    );

    expect(screen.getByLabelText("Resultado do duelo")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Derrota" })).toBeTruthy();
  });
});
