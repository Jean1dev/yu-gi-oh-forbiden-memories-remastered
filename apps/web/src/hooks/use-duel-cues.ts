"use client";

import type { DuelEvent, PlayerId, ZoneReference } from "@yugioh/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CUE_DURATIONS_MS, MAX_CUE_QUEUE, toCues, type DuelCue } from "../lib/free-duel/duel-cues.ts";

function sameZone(left: ZoneReference, right: ZoneReference): boolean {
  return left.player === right.player && left.zoneType === right.zoneType && left.index === right.index;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cueMatchesZone(cue: DuelCue, reference: ZoneReference): boolean {
  switch (cue.kind) {
    case "place":
    case "attack":
    case "destroy":
      return sameZone(cue.zone, reference);
    case "draw":
    case "damage":
      return false;
  }
}

function cueMatchesPlayer(cue: DuelCue, player: PlayerId): boolean {
  switch (cue.kind) {
    case "draw":
    case "damage":
      return cue.player === player;
    case "place":
    case "attack":
    case "destroy":
      return cue.zone.player === player;
  }
}

export function useDuelCues() {
  const [queue, setQueue] = useState<readonly DuelCue[]>([]);
  const [active, setActive] = useState<DuelCue | null>(null);
  const reducedMotion = prefersReducedMotion();

  const enqueue = useCallback((events: readonly DuelEvent[]) => {
    const cues = toCues(events);
    if (cues.length === 0 || prefersReducedMotion()) return;
    setQueue((current) => [...current, ...cues].slice(0, MAX_CUE_QUEUE));
  }, []);
  const clear = useCallback(() => {
    setActive(null);
    setQueue([]);
  }, []);

  useEffect(() => {
    if (active !== null || queue.length === 0 || reducedMotion) return;
    const [next, ...rest] = queue;
    setActive(next ?? null);
    setQueue(rest);
  }, [active, queue, reducedMotion]);

  useEffect(() => {
    if (active === null || reducedMotion) return undefined;
    const timeout = window.setTimeout(() => setActive(null), CUE_DURATIONS_MS[active.kind]);
    return () => window.clearTimeout(timeout);
  }, [active, reducedMotion]);

  return useMemo(
    () => ({
      enqueue,
      clear,
      cueFor: (reference: ZoneReference) =>
        active && cueMatchesZone(active, reference) ? active.kind : undefined,
      cueForPlayer: (player: PlayerId) => (active && cueMatchesPlayer(active, player) ? active : undefined),
      busy: !reducedMotion && (active !== null || queue.length > 0),
    }),
    [active, clear, enqueue, queue.length, reducedMotion],
  );
}
