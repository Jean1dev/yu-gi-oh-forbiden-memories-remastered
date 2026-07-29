import { LIBRARY_SEARCH_TERM_MAX_LENGTH } from "@yugioh/rules";
import { z } from "zod";

const SearchTermSchema = z
  .string()
  .trim()
  .transform((value) => value.slice(0, LIBRARY_SEARCH_TERM_MAX_LENGTH));

export type LibrarySearchTerm = string;

export function readSearchFromUrl(searchParams: URLSearchParams): LibrarySearchTerm {
  const result = SearchTermSchema.safeParse(searchParams.get("q") ?? "");
  return result.success ? result.data : "";
}

export function applySearchToUrl(
  searchParams: URLSearchParams,
  term: LibrarySearchTerm,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const parsed = SearchTermSchema.safeParse(term);
  const normalizedTerm = parsed.success ? parsed.data : "";

  if (normalizedTerm.length === 0) {
    next.delete("q");
  } else {
    next.set("q", normalizedTerm);
  }
  return next;
}

export function removeSearchFromUrl(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete("q");
  return next;
}
