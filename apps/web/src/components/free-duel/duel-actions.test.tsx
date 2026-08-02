// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DuelActions } from "./duel-actions.tsx";
import type { ActionSlot } from "../../lib/free-duel/duel-interaction.ts";

const slots: readonly [ActionSlot, ActionSlot, ActionSlot] = [
  { id: "summon", label: "Invocar", variant: "secondary", disabled: false },
  { id: "none", label: "-", variant: "secondary", disabled: true },
  { id: "advance_phase", label: "Passar Fase", variant: "primary", disabled: false },
];

describe("DuelActions", () => {
  it("always renders three buttons", () => {
    render(<DuelActions slots={slots} onInvoke={() => undefined} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("keeps unavailable slots disabled instead of removing them", () => {
    render(<DuelActions slots={slots} onInvoke={() => undefined} />);
    expect(screen.getByRole("button", { name: "-" })).toHaveProperty("disabled", true);
  });

  it("invokes the selected slot id", () => {
    const onInvoke = vi.fn();
    render(<DuelActions slots={slots} onInvoke={onInvoke} />);
    fireEvent.click(screen.getByRole("button", { name: "Invocar" }));
    expect(onInvoke).toHaveBeenCalledWith("summon");
  });
});
