import { getLibraryCatalog } from "../../../lib/library/catalog-library.ts";
import { toCatalogPayload } from "../../../lib/library/catalog-payload.ts";
import type { LibraryCatalogPayload } from "../../../lib/library/types.ts";
import { CardDetailClient } from "./card-detail-client.tsx";

export type CardDetailPageProps = Readonly<{
  params: Promise<{ cardNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export function libraryReturnDestination(
  searchParams: Readonly<Record<string, string | readonly string[] | undefined>>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (value !== undefined) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }
  const queryString = query.toString();
  return queryString.length === 0 ? "/library" : `/library?${queryString}`;
}

async function loadCatalogPayload(): Promise<LibraryCatalogPayload> {
  const result = await getLibraryCatalog();
  return result.ok ? toCatalogPayload(result.value) : { status: "error" };
}

/**
 * Full-page destination of every cell in the grid, obtained or blocked
 * (spec library/F02, Decisions 4 and 6). The route and the fronteira it
 * opens are this feature's job; the content — field blocks, password copy,
 * previous/next navigation, the blocked state — belongs to library/F05
 * (spec §1, Fronteiras). `cardNumber` is passed through unvalidated: F05 is
 * who resolves an unknown number and the not-obtained state.
 */
export default async function CardDetailPage({ params, searchParams }: CardDetailPageProps) {
  const { cardNumber } = await params;
  const returnDestination = libraryReturnDestination(await searchParams);
  return (
    <main>
      <CardDetailClient
        cardNumber={cardNumber}
        returnDestination={returnDestination}
        catalogResult={await loadCatalogPayload()}
      />
    </main>
  );
}
