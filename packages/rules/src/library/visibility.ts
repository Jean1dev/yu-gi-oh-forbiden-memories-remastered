import type { LibraryEntry } from "@yugioh/shared";

/**
 * F02's default cut and the pattern F04 generalizes into the full
 * `obtained | not-obtained | all` status filter (spec library/F02, Decision
 * 11). Kept here rather than in a component so the UI never decides
 * ownership on its own (ADR-004).
 */
export function onlyObtained(entries: readonly LibraryEntry[]): readonly LibraryEntry[] {
  return entries.filter((entry) => entry.obtained);
}
