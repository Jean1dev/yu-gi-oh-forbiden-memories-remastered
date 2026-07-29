export { buildLibraryIndex, type LibraryCrossReferenceInput } from "./build-index.ts";
export { resolveArtReference } from "./art.ts";
export { calculateProgress, findEntry, isObtained } from "./progress.ts";
export {
  filterLibrarySearch,
  LIBRARY_SEARCH_TERM_MAX_LENGTH,
  normalizeLibrarySearchTerm,
  prepareLibrarySearch,
  type LibrarySearchEntry,
  type LibrarySearchIndex,
  type NormalizedLibrarySearchTerm,
} from "./search.ts";
export { onlyObtained } from "./visibility.ts";
