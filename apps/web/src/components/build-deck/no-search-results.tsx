import { noSearchResultsMessage } from "./messages.ts";

export type NoSearchResultsProps = Readonly<{ term: string }>;

/** Shown when the search term matches no owned card; the search field stays visible. */
export function NoSearchResults({ term }: NoSearchResultsProps) {
  return <p role="status">{noSearchResultsMessage(term)}</p>;
}
