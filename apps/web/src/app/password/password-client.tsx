"use client";

import { useMemo } from "react";

import { CardPreview } from "../../components/password/card-preview.tsx";
import { CatalogUnavailable } from "../../components/password/catalog-unavailable.tsx";
import { LookupFailure } from "../../components/password/lookup-failure.tsx";
import { PasswordField } from "../../components/password/password-field.tsx";
import styles from "../../components/password/password.module.css";
import { StarBalance } from "../../components/password/star-balance.tsx";
import { RedeemAction } from "../../components/password/redeem-action.tsx";
import { RedemptionFeedback } from "../../components/password/redemption-feedback.tsx";
import { useCardRedemption } from "../../hooks/use-card-redemption.ts";
import { useSession } from "../../hooks/use-session.ts";
import { useRedemptionSync } from "../../hooks/use-redemption-sync.ts";
import { createIndexedDbRedemptionQueue } from "../../lib/redemption/redemption-queue.ts";
import { createSupabaseRedemptionRepository } from "../../lib/redemption/redemption-repository.ts";
import { createSupabaseClient } from "../../lib/supabase/client.ts";
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
  const session = useSession();
  const playerId = session.status === "guest" || session.status === "authenticated" ? session.playerId : undefined;
  const syncDeps = useMemo(() => {
    try { return { repository: createSupabaseRedemptionRepository(createSupabaseClient()), queue: createIndexedDbRedemptionQueue(), clock: { now: () => new Date() }, ids: { newId: () => crypto.randomUUID() } }; }
    catch { return undefined; }
  }, []);
  useRedemptionSync(playerId, syncDeps);
  const redemption = useCardRedemption({playerId,password:lookup.rawInput,cardNumber:resolution?.status==="resolved"?resolution.card.numero:"000",priceStars:resolution?.status==="resolved"?resolution.price.stars:0,balanceStars});

  return (
    <main className={styles.screen}>
      <h1>Password</h1>
      <StarBalance state={wallet} />
      <PasswordField value={lookup.rawInput} onChange={lookup.setRawInput} onSubmit={lookup.submit} />
      {resolution?.status === "resolved" && catalog !== undefined ? (
        <CardPreview resolution={resolution} art={catalog.artLookup(resolution.card.numero)} cropArt={catalog.cropArtLookup(resolution.card.numero)} action={<><RedeemAction priceStars={resolution.price.stars} disabled={!playerId || redemption.eligibility?.status!=="ready"} submitting={redemption.submitting} onRedeem={()=>void redemption.redeem()} /><RedemptionFeedback outcome={redemption.outcome} cardName={resolution.card.nome} /></>} />
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
