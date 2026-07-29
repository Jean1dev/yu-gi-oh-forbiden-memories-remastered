import type { CardArtLookup } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";

import { resolveArtReference } from "./art.ts";

describe("resolveArtReference", () => {
  it("returns silhouette for a not-obtained card", () => {
    const artLookup: CardArtLookup = vi.fn();

    const result = resolveArtReference("380", false, artLookup);

    expect(result).toEqual({ kind: "silhouette" });
  });

  it("does not consult the resolver for a not-obtained card", () => {
    const artLookup: CardArtLookup = vi.fn();

    resolveArtReference("380", false, artLookup);

    expect(artLookup).not.toHaveBeenCalled();
  });

  it("returns art with a path for an obtained card with an existing file", () => {
    const artLookup: CardArtLookup = () => ({ kind: "art", path: "cards-data/001.jpg" });

    const result = resolveArtReference("001", true, artLookup);

    expect(result).toEqual({ kind: "art", path: "cards-data/001.jpg" });
  });

  it("returns placeholder for an obtained card with no art file", () => {
    const artLookup: CardArtLookup = () => ({ kind: "placeholder" });

    const result = resolveArtReference("413", true, artLookup);

    expect(result).toEqual({ kind: "placeholder" });
  });

  it("never returns a path on the silhouette variant", () => {
    const artLookup: CardArtLookup = vi.fn();

    const result = resolveArtReference("380", false, artLookup);

    expect(result).not.toHaveProperty("path");
  });
});
