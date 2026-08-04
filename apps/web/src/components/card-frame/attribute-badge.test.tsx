// @vitest-environment jsdom
import type { Attribute } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AttributeBadge } from "./attribute-badge.tsx";

const ATTRIBUTES: readonly Attribute[] = [
  "DARK",
  "LIGHT",
  "EARTH",
  "WATER",
  "FIRE",
  "WIND",
  "DIVINE",
];

describe("AttributeBadge", () => {
  it.each(ATTRIBUTES)("renders a badge for %s", (attribute) => {
    render(<AttributeBadge attribute={attribute} />);
    expect(screen.getByRole("img", { name: attribute })).toBeTruthy();
  });

  it("renders nothing when attribute is null", () => {
    const { container } = render(<AttributeBadge attribute={null} />);
    expect(container.firstChild).toBeNull();
  });
});
