import { describe, expect, it } from "vitest";
import { normalizePasswordInput } from "./normalize.ts";

describe("normalizePasswordInput", () => {
  it.each(["89631139", "89 63 11 39", "  89  63 11   39 ", "89\t63\n11 39"])(
    "normalizes %j to the canonical password",
    (raw) => expect(normalizePasswordInput(raw)).toEqual({ status: "canonical", value: "89 63 11 39" }),
  );
  it("rejects non-digits", () => expect(normalizePasswordInput("89-63-11-39")).toEqual({ status: "malformed", reason: "non_digit" }));
  it.each(["8963113", "896311399"])("rejects the wrong length", (raw) => expect(normalizePasswordInput(raw)).toEqual({ status: "malformed", reason: "wrong_length" }));
  it.each(["", "  \t\n"])("recognizes empty input", (raw) => expect(normalizePasswordInput(raw)).toEqual({ status: "empty" }));
  it("bounds long input", () => expect(normalizePasswordInput("1".repeat(100))).toEqual({ status: "malformed", reason: "wrong_length" }));
});
