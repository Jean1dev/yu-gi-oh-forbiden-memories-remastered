import { describe, expect, it } from "vitest";

import { applySearchToUrl, readSearchFromUrl, removeSearchFromUrl } from "./search-url.ts";

describe("readSearchFromUrl", () => {
  it("returns an empty term when q is absent or empty", () => {
    expect(readSearchFromUrl(new URLSearchParams())).toBe("");
    expect(readSearchFromUrl(new URLSearchParams("q="))).toBe("");
  });

  it("trims and truncates q to the effective limit", () => {
    expect(readSearchFromUrl(new URLSearchParams({ q: ` ${"x".repeat(81)} ` }))).toBe(
      "x".repeat(80),
    );
  });
});

describe("applySearchToUrl", () => {
  it("writes q while preserving current and future filters", () => {
    const params = new URLSearchParams("status=all&type=monster&sort=name&direction=asc");
    const result = applySearchToUrl(params, "dragon");

    expect(result.get("q")).toBe("dragon");
    expect(result.get("status")).toBe("all");
    expect(result.get("type")).toBe("monster");
    expect(result.get("sort")).toBe("name");
    expect(result.get("direction")).toBe("asc");
  });

  it("removes q when the term is empty and preserves unknown parameters", () => {
    const result = applySearchToUrl(new URLSearchParams("q=dragon&future=value"), "  ");
    expect(result.has("q")).toBe(false);
    expect(result.get("future")).toBe("value");
  });

  it("does not mutate the received URLSearchParams", () => {
    const original = new URLSearchParams("q=old");
    applySearchToUrl(original, "new");
    expect(original.get("q")).toBe("old");
  });
});

describe("removeSearchFromUrl", () => {
  it("removes only q", () => {
    const result = removeSearchFromUrl(new URLSearchParams("q=dragon&status=all"));
    expect(result.toString()).toBe("status=all");
  });
});
