export type LibrarySearchNoResultsProps = Readonly<{ term: string }>;

export function LibrarySearchNoResults({ term }: LibrarySearchNoResultsProps) {
  return <p aria-live="polite">{`Nenhuma carta encontrada para '${term}'.`}</p>;
}
