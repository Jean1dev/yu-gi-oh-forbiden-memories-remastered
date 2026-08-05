// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SpellTrapBadge } from "./spell-trap-badge.tsx";

describe("SpellTrapBadge", () => {
  it("renders the trap label and color when tipo is armadilha", () => {
    render(<SpellTrapBadge tipo="armadilha" />);
    const badge = screen.getByRole("img", { name: "ARMADILHA" });
    expect(badge.dataset.kind).toBe("armadilha");
  });

  it.each(["magica", "equipamento", "ritual"] as const)(
    "renders the spell label and color when tipo is %s",
    (tipo) => {
      render(<SpellTrapBadge tipo={tipo} />);
      const badge = screen.getByRole("img", { name: "MAGIA" });
      expect(badge.dataset.kind).toBe("magia");
    },
  );
});
