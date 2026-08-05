import { describe, expect, it } from "vitest";
import { createFusionSequenceResolver } from "./create-fusion-resolver.ts";

const pairs = new Map([
  ["001:002", "010"],
  ["003:010", "020"],
]);
const resolver = createFusionSequenceResolver((left, right) =>
  pairs.get([left, right].sort().join(":")),
);

describe("createFusionSequenceResolver", () => {
  it("reduces a successful ordered sequence", () =>
    expect(resolver(["001", "002", "003"])).toMatchObject({ result: "020", fused: true }));
  it("discards a failed accumulator and keeps the next material", () =>
    expect(resolver(["001", "003", "002"])).toMatchObject({ result: "002", fused: false }));
  it("accepts only two through five materials", () => {
    expect(resolver(["001"])).toBeUndefined();
    expect(resolver(["001", "002", "003", "004", "005", "006"])).toBeUndefined();
  });
});
