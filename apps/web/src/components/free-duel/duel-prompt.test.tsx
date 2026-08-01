// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DuelPrompt } from "./duel-prompt.tsx";

describe("DuelPrompt", () => {
  it("offers the four summon positions in Portuguese", () => {
    render(
      <DuelPrompt
        intent={{ kind: "choosing_position", handIndex: 0, zoneIndex: 0 }}
        onChoosePosition={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Ataque" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ataque (virada)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Defesa" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Defesa (virada)" })).toBeTruthy();
  });

  it("emits the chosen position and supports cancel", () => {
    const onChoosePosition = vi.fn();
    const onCancel = vi.fn();
    render(
      <DuelPrompt
        intent={{ kind: "choosing_position", handIndex: 0, zoneIndex: 0 }}
        onChoosePosition={onChoosePosition}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Defesa (virada)" }));
    expect(onChoosePosition).toHaveBeenCalledWith("defense_face_down");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
