// @vitest-environment jsdom
import{render,screen}from"@testing-library/react";import{describe,expect,it}from"vitest";import{RedemptionFeedback}from"./redemption-feedback.tsx";
describe("redemption feedback",()=>{it("announces success",()=>{render(<RedemptionFeedback cardName="Dragão" outcome={{status:"applied",cardNumber:"001",starsSpent:10,walletStars:5,cardQuantity:1,redeemedAt:"now"}}/>);expect(screen.getByRole("status").textContent).toContain("Dragão adicionada");});});
