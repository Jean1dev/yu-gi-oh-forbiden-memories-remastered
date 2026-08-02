"use client";
import { useMemo, useState } from "react";
import { evaluateRedemptionEligibility } from "@yugioh/rules";
import { EXPENSIVE_REDEMPTION_THRESHOLD_STARS, type CardNumber, type CardRedemptionOutcome } from "@yugioh/shared";
import { createIndexedDbRedemptionQueue } from "../lib/redemption/redemption-queue.ts";
import { redeemCardByPassword } from "../lib/redemption/redeem-card.ts";
import { createSupabaseRedemptionRepository } from "../lib/redemption/redemption-repository.ts";
import { createSupabaseClient } from "../lib/supabase/client.ts";
import { useWalletStore } from "../stores/wallet-store.ts";

export function useCardRedemption(input:{playerId:string|undefined;password:string;cardNumber:CardNumber;priceStars:number;balanceStars:number|undefined}) {
 const [outcome,setOutcome]=useState<CardRedemptionOutcome>(); const [submitting,setSubmitting]=useState(false); const eligibility=useMemo(()=>evaluateRedemptionEligibility({priceStars:input.priceStars,balanceStars:input.balanceStars,thresholdStars:EXPENSIVE_REDEMPTION_THRESHOLD_STARS}),[input.priceStars,input.balanceStars]);
 async function redeem(){if(submitting||!input.playerId||!eligibility.ok||eligibility.value.status!=="ready")return;setSubmitting(true);try{const client=createSupabaseClient();const result=await redeemCardByPassword({redemptionId:crypto.randomUUID(),playerId:input.playerId,password:input.password,expectedCardNumber:input.cardNumber,expectedStars:input.priceStars,createdAt:new Date().toISOString()},{repository:createSupabaseRedemptionRepository(client),queue:createIndexedDbRedemptionQueue(),clock:{now:()=>new Date()},ids:{newId:()=>crypto.randomUUID()}});if(result.ok){setOutcome(result.value);if(result.value.status==="applied"||result.value.status==="already_applied")useWalletStore.getState().setAuthoritativeBalance(result.value.walletStars);}}finally{setSubmitting(false);}}
 return {eligibility:eligibility.ok?eligibility.value:undefined,outcome,submitting,redeem};
}
