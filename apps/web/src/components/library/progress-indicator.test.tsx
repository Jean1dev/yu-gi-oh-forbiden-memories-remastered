// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressIndicator } from "./progress-indicator.tsx";

describe("ProgressIndicator", () => {
  it("shows the obtained count and the total from the index", () => {
    render(<ProgressIndicator progress={{ obtained: 12, total: 722 }} />);

    expect(screen.getByRole("status").textContent).toContain("12 de 722 obtidas");
  });

  it("shows zero of total for an empty collection", () => {
    render(<ProgressIndicator progress={{ obtained: 0, total: 722 }} />);

    expect(screen.getByRole("status").textContent).toContain("0 de 722 obtidas");
  });

  it("shows total of total for a complete collection", () => {
    render(<ProgressIndicator progress={{ obtained: 722, total: 722 }} />);

    expect(screen.getByRole("status").textContent).toContain("722 de 722 obtidas");
  });

  it("announces the count change through the live region on re-render", () => {
    const { rerender } = render(<ProgressIndicator progress={{ obtained: 12, total: 722 }} />);
    rerender(<ProgressIndicator progress={{ obtained: 13, total: 722 }} />);

    expect(screen.getByRole("status").textContent).toContain("13 de 722 obtidas");
  });

  it("does not contain the literal seven hundred twenty-two in the source", () => {
    const source = readFileSync(join(import.meta.dirname, "progress-indicator.tsx"), "utf-8");
    expect(source).not.toContain("722");
  });
});
