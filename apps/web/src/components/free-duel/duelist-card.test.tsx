// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DuelistCard } from "./duelist-card.tsx";

const duelist = {
  id: "duelist-one",
  name: "Duelist One",
  portrait: "duelists/missing.webp",
  difficulty: "easy",
  profile: { strategy: "balanced", parameters: {} },
  deck: [],
  dropPool: [],
} as const;

describe("DuelistCard", () => {
  it("uses a placeholder when the declared portrait fails", () => {
    render(<DuelistCard duelist={duelist} selected={false} onSelect={vi.fn()} />);
    fireEvent.error(screen.getByRole("presentation"));
    expect(screen.getByLabelText("Retrato indisponível")).toBeTruthy();
  });
});
