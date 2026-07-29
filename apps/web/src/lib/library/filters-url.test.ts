import { DEFAULT_LIBRARY_FILTERS, type LibraryFilters } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import {
  clearLibraryFiltersUrl,
  parseLibraryFiltersUrl,
  serializeLibraryFiltersUrl,
} from "./filters-url.ts";

describe("parseLibraryFiltersUrl", () => {
  it("returns defaults when there are no filter parameters", () => {
    expect(parseLibraryFiltersUrl(new URLSearchParams()).filters).toEqual(DEFAULT_LIBRARY_FILTERS);
  });

  it("accepts multiple types and deduplicates repeated values", () => {
    const result = parseLibraryFiltersUrl(
      new URLSearchParams("tipo=monstro&tipo=magica&tipo=monstro"),
    );
    expect(result.filters.types).toEqual(["monstro", "magica"]);
  });

  it("discards invalid types and normalizes invalid scalar values", () => {
    const result = parseLibraryFiltersUrl(
      new URLSearchParams("tipo=ritual&status=x&ordem=x&direcao=x"),
    );
    expect(result.filters).toEqual(DEFAULT_LIBRARY_FILTERS);
    expect(result.discarded).toHaveLength(4);
  });

  it("parses every nondefault filter", () => {
    expect(
      parseLibraryFiltersUrl(
        new URLSearchParams("tipo=equipamento&status=todas&ordem=atk&direcao=desc"),
      ).filters,
    ).toEqual({
      types: ["equipamento"],
      status: "todas",
      sort: { field: "atk", direction: "desc" },
    });
  });
});

describe("serializeLibraryFiltersUrl", () => {
  it("omits defaults and preserves the search term", () => {
    const result = serializeLibraryFiltersUrl(
      DEFAULT_LIBRARY_FILTERS,
      new URLSearchParams("q=dragon&status=todas"),
    );
    expect(result.toString()).toBe("q=dragon");
  });

  it("writes nondefault filters in canonical form", () => {
    const filters: LibraryFilters = {
      types: ["monstro", "equipamento"],
      status: "todas",
      sort: { field: "atk", direction: "desc" },
    };
    expect(serializeLibraryFiltersUrl(filters, new URLSearchParams()).toString()).toBe(
      "tipo=equipamento&tipo=monstro&status=todas&ordem=atk&direcao=desc",
    );
  });

  it("clearing removes only F04 parameters", () => {
    const result = clearLibraryFiltersUrl(
      new URLSearchParams("q=dragon&tipo=monstro&status=todas&ordem=atk&direcao=desc&future=x"),
    );
    expect(result.toString()).toBe("q=dragon&future=x");
  });
});
