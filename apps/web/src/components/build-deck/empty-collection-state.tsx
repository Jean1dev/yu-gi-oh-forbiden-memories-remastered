import { BUILD_DECK_MESSAGES } from "./messages.ts";

/** Shown before build-deck/F02 seeds the collection, or after it is emptied out; no search field. */
export function EmptyCollectionState() {
  return <p role="status">{BUILD_DECK_MESSAGES.emptyCollection}</p>;
}
