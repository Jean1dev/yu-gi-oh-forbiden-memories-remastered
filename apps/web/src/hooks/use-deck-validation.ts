"use client";

import { validateDeckDraft } from "@yugioh/rules";
import type { DeckDraftValidationResult } from "@yugioh/shared";
import { useMemo } from "react";

import { useCollection } from "./use-collection.ts";
import { useDeckDraft } from "./use-deck-draft.ts";

export type UseDeckValidationResult = DeckDraftValidationResult & Readonly<{ loading: boolean }>;

/**
 * Combines the draft (F05's `useDeckDraft`) and the owned collection (F01's
 * `useCollection`) into a live validation verdict, recalculated on every
 * render via `useMemo` — no debounce, no network call (spec build-deck/F06
 * §3, Fluxo step 2).
 *
 * While the collection has not resolved into a usable snapshot yet — this
 * codebase's `useCollection` has three states (`loading`/`ready`/`error`),
 * not the two-state boolean the spec assumed (spec build-deck/F06 Decision
 * 7) — this returns the neutral result instead of calling
 * `validateDeckDraft`, so no false "exceeds owned quantity" violation
 * flashes before the real collection arrives.
 */
export function useDeckValidation(): UseDeckValidationResult {
  const { draft, total } = useDeckDraft();
  const collectionState = useCollection();

  return useMemo((): UseDeckValidationResult => {
    if (collectionState.status !== "ready") {
      return { valid: false, total, violations: [], loading: true };
    }
    return { ...validateDeckDraft(draft, collectionState.loaded.collection), loading: false };
  }, [draft, total, collectionState]);
}
