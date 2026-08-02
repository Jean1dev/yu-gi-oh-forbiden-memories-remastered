"use client";
import { useEffect } from "react";
import type { RedeemCardDeps } from "../lib/redemption/redeem-card.ts";
import { syncRedemptionQueue } from "../lib/redemption/sync-redemption-queue.ts";
export function useRedemptionSync(playerId:string|undefined,deps:RedeemCardDeps|undefined){useEffect(()=>{if(!playerId||!deps)return;const drain=()=>{void syncRedemptionQueue({playerId,...deps});};window.addEventListener("online",drain);return()=>window.removeEventListener("online",drain);},[playerId,deps]);}
