import { DetailModal } from "../../../../components/library/detail-modal.tsx";

export type InterceptedCardDetailPageProps = Readonly<{
  params: Promise<{ cardNumber: string }>;
}>;

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
}: InterceptedCardDetailPageProps) {
  const { cardNumber } = await params;
  return (
    <DetailModal>
      <p>Detalhe da carta {cardNumber} — conteúdo implementado por library/F05.</p>
    </DetailModal>
  );
}
