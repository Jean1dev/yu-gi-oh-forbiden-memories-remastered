import { describe, expect, it } from "vitest";

import { isFaceDown, nextPosition } from "./next-position.ts";

describe("nextPosition", () => {
  it("transforma attack_face_up em defense_face_up", () => {
    expect(nextPosition("attack_face_up")).toBe("defense_face_up");
  });

  it("transforma defense_face_up em attack_face_up", () => {
    expect(nextPosition("defense_face_up")).toBe("attack_face_up");
  });

  it("transforma defense_face_down em attack_face_up", () => {
    expect(nextPosition("defense_face_down")).toBe("attack_face_up");
  });

  it("transforma attack_face_down em defense_face_up", () => {
    expect(nextPosition("attack_face_down")).toBe("defense_face_up");
  });
});

describe("isFaceDown", () => {
  it("devolve true para defense_face_down e attack_face_down", () => {
    expect(isFaceDown("defense_face_down")).toBe(true);
    expect(isFaceDown("attack_face_down")).toBe(true);
  });

  it("devolve false para defense_face_up e attack_face_up", () => {
    expect(isFaceDown("defense_face_up")).toBe(false);
    expect(isFaceDown("attack_face_up")).toBe(false);
  });
});
