// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DetailModal } from "./detail-modal.tsx";

describe("DetailModal", () => {
  it("renders its children inside an accessible dialog", () => {
    render(
      <DetailModal>
        <p>Detalhe da carta 001</p>
      </DetailModal>,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Detalhe da carta 001")).toBeTruthy();
  });
});
