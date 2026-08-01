// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { DuelEvent, ZoneReference } from "@yugioh/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CUE_DURATIONS_MS } from "../lib/free-duel/duel-cues.ts";
import { useDuelCues } from "./use-duel-cues.ts";

const zone: ZoneReference = { player: "P1", zoneType: "monster", index: 0 };
const event: DuelEvent = {
  type: "onSummon",
  originPlayer: "P1",
  involvedCards: [],
  involvedZones: [zone],
  context: {},
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useDuelCues", () => {
  it("marks a cue active and clears it after its duration", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDuelCues());

    act(() => result.current.enqueue([event]));
    expect(result.current.busy).toBe(true);
    expect(result.current.cueFor(zone)).toBe("place");

    act(() => vi.advanceTimersByTime(CUE_DURATIONS_MS.place));
    expect(result.current.busy).toBe(false);
    expect(result.current.cueFor(zone)).toBeUndefined();
  });

  it("consumes cues in enqueue order", () => {
    vi.useFakeTimers();
    const secondZone: ZoneReference = { player: "P2", zoneType: "monster", index: 1 };
    const { result } = renderHook(() => useDuelCues());

    act(() =>
      result.current.enqueue([
        event,
        { ...event, type: "onDestroy", involvedZones: [secondZone] },
      ]),
    );
    act(() => vi.advanceTimersByTime(0));
    expect(result.current.cueFor(zone)).toBe("place");
    act(() => vi.advanceTimersByTime(CUE_DURATIONS_MS.place));
    act(() => vi.advanceTimersByTime(0));
    expect(result.current.cueFor(secondZone)).toBe("destroy");
  });

  it("does not become busy when reduced motion is preferred", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { result } = renderHook(() => useDuelCues());

    act(() => result.current.enqueue([event]));

    expect(result.current.busy).toBe(false);
    expect(result.current.cueFor(zone)).toBeUndefined();
  });

  it("does not throw when matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useDuelCues());
    expect(() => result.current.enqueue([event])).not.toThrow();
  });
});
