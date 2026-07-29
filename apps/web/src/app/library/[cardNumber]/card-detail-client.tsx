"use client";

import { findEntry } from "@yugioh/rules";
import { CardNumberSchema } from "@yugioh/shared";
import { useMemo } from "react";

import { LibraryBackAction } from "../../../components/library/library-back-action.tsx";
import { LibraryFailure } from "../../../components/library/library-failure.tsx";
import { LIBRARY_MESSAGES } from "../../../components/library/messages.ts";
import { useLibrary } from "../../../hooks/use-library.ts";
import { fromCatalogPayload } from "../../../lib/library/catalog-payload.ts";
import type { LibraryCatalogPayload } from "../../../lib/library/types.ts";

export type CardDetailClientProps = Readonly<{
  cardNumber: string;
  returnDestination: string;
  catalogResult: LibraryCatalogPayload;
}>;

function failureMessage(code: string): string {
  if (code === "catalog_unavailable") {
    return LIBRARY_MESSAGES.catalogUnavailable;
  }
  if (code === "session_missing") {
    return LIBRARY_MESSAGES.sessionMissing;
  }
  return LIBRARY_MESSAGES.collectionUnavailable;
}

export function CardDetailClient({
  cardNumber,
  returnDestination,
  catalogResult,
}: CardDetailClientProps) {
  const catalog = useMemo(() => fromCatalogPayload(catalogResult), [catalogResult]);
  const state = useLibrary(catalog);

  if (state.status === "loading") {
    return <div aria-label="Carregando detalhe da carta" aria-busy="true" />;
  }

  if (state.status === "error") {
    return <LibraryFailure message={failureMessage(state.error.code)} onReload={state.reload} />;
  }

  const parsedCardNumber = CardNumberSchema.safeParse(cardNumber);
  const entry = parsedCardNumber.success
    ? findEntry(state.loaded.index, parsedCardNumber.data)
    : undefined;

  if (entry === undefined) {
    return (
      <section aria-labelledby="card-not-found-title">
        <h1 id="card-not-found-title">{LIBRARY_MESSAGES.cardNotFound}</h1>
        <LibraryBackAction returnDestination={returnDestination} />
      </section>
    );
  }

  return (
    <section aria-label={`Detalhe da carta ${entry.cardNumber}`}>
      <p>{entry.obtained ? entry.card.nome : LIBRARY_MESSAGES.cardNotObtained}</p>
      <LibraryBackAction returnDestination={returnDestination} />
    </section>
  );
}
