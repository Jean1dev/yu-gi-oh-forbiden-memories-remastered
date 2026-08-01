// @vitest-environment jsdom
import{renderHook}from"@testing-library/react";import{describe,expect,it}from"vitest";import{useCardRedemption}from"./use-card-redemption.ts";
describe("card redemption hook",()=>{it("blocks an insufficient balance",()=>{const{result}=renderHook(()=>useCardRedemption({playerId:"p",password:"12 34 56 78",cardNumber:"001",priceStars:10,balanceStars:5}));expect(result.current.eligibility?.status).toBe("blocked_insufficient");});});
