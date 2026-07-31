"use client";

import { useMemo } from "react";

import { CardPreview } from "../../components/password/card-preview.tsx";
import { CatalogUnavailable } from "../../components/password/catalog-unavailable.tsx";
import { LookupFailure } from "../../components/password/lookup-failure.tsx";
import { PasswordField } from "../../components/password/password-field.tsx";
import styles from "../../components/password/password.module.css";
import { StarBalance } from "../../components/password/star-balance.tsx";
import { usePasswordLookup } from "../../hooks/use-password-lookup.ts";
import { useWalletBalance } from "../../hooks/use-wallet-balance.ts";
import { fromPasswordPayload } from "../../lib/password/catalog-payload.ts";
import type { PasswordCatalogPayload } from "../../lib/password/types.ts";

export type PasswordClientProps = Readonly<{ catalogResult: PasswordCatalogPayload }>;

function ReadyPassword({ catalogResult }: PasswordClientProps) {
  const catalog = useMemo(() => fromPasswordPayload(catalogResult), [catalogResult]);
  const wallet = useWalletBalance();
  const balanceStars = wallet.status === "ready" ? wallet.loaded.effectiveStars : undefined;
  const lookup = usePasswordLookup(catalog?.lookup ?? (() => undefined), balanceStars);
  const { resolution } = lookup;

  return (
    <main className={styles.screen}>
      <h1>Password</h1>
      <StarBalance state={wallet} />
      <PasswordField value={lookup.rawInput} onChange={lookup.setRawInput} onSubmit={lookup.submit} />
      {resolution?.status === "resolved" && catalog !== undefined ? (
        <CardPreview resolution={resolution} art={catalog.artLookup(resolution.card.numero)} />
      ) : resolution !== undefined && resolution.status !== "resolved" ? (
        <LookupFailure resolution={resolution} />
      ) : null}
    </main>
  );
}

export function PasswordClient({ catalogResult }: PasswordClientProps) {
  if (catalogResult.status === "error") {
    return <main className={styles.screen}><h1>Password</h1><CatalogUnavailable /></main>;
  }
  return <ReadyPassword catalogResult={catalogResult} />;
}
