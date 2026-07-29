export type CardDetailPageProps = Readonly<{
  params: Promise<{ cardNumber: string }>;
}>;

/**
 * Full-page destination of every cell in the grid, obtained or blocked
 * (spec library/F02, Decisions 4 and 6). The route and the fronteira it
 * opens are this feature's job; the content — field blocks, password copy,
 * previous/next navigation, the blocked state — belongs to library/F05
 * (spec §1, Fronteiras). `cardNumber` is passed through unvalidated: F05 is
 * who resolves an unknown number and the not-obtained state.
 */
export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardNumber } = await params;
  return (
    <main>
      <p>Detalhe da carta {cardNumber} — conteúdo implementado por library/F05.</p>
    </main>
  );
}
