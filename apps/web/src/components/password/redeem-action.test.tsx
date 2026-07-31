// @vitest-environment jsdom
import{fireEvent,render,screen}from"@testing-library/react";import{describe,expect,it,vi}from"vitest";import{RedeemAction}from"./redeem-action.tsx";
describe("redeem action",()=>{it("shows price and submits once",()=>{const fn=vi.fn();render(<RedeemAction priceStars={10} disabled={false} submitting={false} onRedeem={fn}/>);fireEvent.click(screen.getByRole("button"));expect(screen.getByText(/10/)).toBeTruthy();expect(fn).toHaveBeenCalledOnce();});});
