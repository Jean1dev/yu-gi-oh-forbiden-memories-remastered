import { DetailModal } from "../../../../components/library/detail-modal.tsx";
import { getLibraryCatalog } from "../../../../lib/library/catalog-library.ts";
import { toCatalogPayload } from "../../../../lib/library/catalog-payload.ts";
import type { LibraryCatalogPayload } from "../../../../lib/library/types.ts";
import { CardDetailClient } from "../../[cardNumber]/card-detail-client.tsx";
import { libraryReturnDestination } from "../../[cardNumber]/page.tsx";

export type InterceptedCardDetailPageProps = Readonly<{
  params: Promise<{ cardNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

async function loadCatalogPayload(): Promise<LibraryCatalogPayload> {
  const result = await getLibraryCatalog();
  return result.ok ? toCatalogPayload(result.value) : { status: "error" };
}

/**
 * Intercepts a soft navigation from `/library` into `/library/[cardNumber]`
 * and renders the same (still-placeholder) content inside {@link
 * DetailModal} instead of a full page reload — the mechanism behind "modal
 * on wide screens, full page on narrow ones" (spec library/F02, Decision 4,
 * Contrato de rota). A hard navigation (refresh, typed URL, shared link)
 * bypasses this slot entirely and renders `[cardNumber]/page.tsx`.
 */
export default async function InterceptedCardDetailPage({
  params,
  searchParams,
}: InterceptedCardDetailPageProps) {
  const { cardNumber } = await params;
  return (
    <DetailModal>
      <CardDetailClient
        cardNumber={cardNumber}
        returnDestination={libraryReturnDestination(await searchParams)}
        catalogResult={await loadCatalogPayload()}
      />
    </DetailModal>
  );
}
