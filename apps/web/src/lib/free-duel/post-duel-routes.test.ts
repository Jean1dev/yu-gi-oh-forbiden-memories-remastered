import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  buildRematchHref,
  MAIN_MENU_HREF,
  OPPONENT_SELECTION_HREF,
} from "./post-duel-routes.ts";

describe("post-duel routes", () => {
  it("buildRematchHref builds the prepare route for the given duelistId", () => {
    expect(buildRematchHref("seto")).toBe("/free-duel/seto/prepare");
  });

  it("buildRematchHref preserves the duelistId literally, without trimming or escaping", () => {
    expect(buildRematchHref(" seto/kaiba ")).toBe("/free-duel/ seto/kaiba /prepare");
  });

  it("buildRematchHref preserves route-safe duelistIds for every non-empty value", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9-]+$/),
        (duelistId) => {
          const href = buildRematchHref(duelistId);
          expect(href).toBe(`/free-duel/${duelistId}/prepare`);
          expect(href.startsWith("/free-duel/")).toBe(true);
          expect(href.includes(duelistId)).toBe(true);
          expect(href.endsWith("/prepare")).toBe(true);
        },
      ),
    );
  });

  it("OPPONENT_SELECTION_HREF points to the module roster route", () => {
    expect(OPPONENT_SELECTION_HREF).toBe("/free-duel");
  });

  it("MAIN_MENU_HREF points to the app root route", () => {
    expect(MAIN_MENU_HREF).toBe("/");
  });
});
