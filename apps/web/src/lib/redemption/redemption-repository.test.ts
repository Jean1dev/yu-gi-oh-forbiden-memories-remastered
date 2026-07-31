import { describe,expect,it } from "vitest";
import { createSupabaseRedemptionRepository } from "./redemption-repository.ts";
const intent={redemptionId:"00000000-0000-4000-8000-000000000001",playerId:"00000000-0000-4000-8000-000000000002",password:"12 34 56 78",expectedCardNumber:"001",expectedStars:10,createdAt:"2026-01-01T00:00:00.000Z"} as const;
describe("redemption repository",()=>{it("maps an applied response",async()=>{const client={rpc:async()=>({data:[{status:"applied",card_numero:"001",stars_spent:10,wallet_stars:0,card_quantity:1,dataset_version:"v",redeemed_at:"2026-01-01T00:00:00.000Z"}],error:null})};expect(await createSupabaseRedemptionRepository(client as never).redeem(intent)).toMatchObject({ok:true,value:{status:"applied",walletStars:0}});});});
