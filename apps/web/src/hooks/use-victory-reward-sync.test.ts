// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useVictoryRewardSync } from "./use-victory-reward-sync.ts";

describe("useVictoryRewardSync", () => {
  it("leaves the queue untouched when no catalog is available", () => {
    const { unmount } = renderHook(() => useVictoryRewardSync(undefined));
    expect(() => window.dispatchEvent(new Event("online"))).not.toThrow();
    unmount();
  });
});
