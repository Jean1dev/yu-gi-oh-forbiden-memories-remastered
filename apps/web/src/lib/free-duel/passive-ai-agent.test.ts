import { describe, expect, it, vi } from "vitest";
import { createPassiveAiAgent } from "./passive-ai-agent.ts";

describe("createPassiveAiAgent", () => {
  it("always returns advance_phase", async () => {
    await expect(
      createPassiveAiAgent({ sleep: async () => undefined }).decide({} as never, {
        strategy: "passive",
        parameters: {},
      }),
    ).resolves.toEqual({ type: "advance_phase" });
  });

  it("waits for the injected sleep before deciding", async () => {
    const sleep = vi.fn(async () => undefined);
    const agent = createPassiveAiAgent({ sleep, delayMs: 12 });

    await agent.decide({} as never, { strategy: "passive", parameters: {} });

    expect(sleep).toHaveBeenCalledWith(12);
  });

  it("uses 650ms as the default delay", async () => {
    const sleep = vi.fn(async () => undefined);

    await createPassiveAiAgent({ sleep }).decide({} as never, {
      strategy: "passive",
      parameters: {},
    });

    expect(sleep).toHaveBeenCalledWith(650);
  });
});
