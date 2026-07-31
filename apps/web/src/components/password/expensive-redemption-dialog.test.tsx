// @vitest-environment jsdom
import{fireEvent,render,screen}from"@testing-library/react";import{describe,expect,it,vi}from"vitest";import{ExpensiveRedemptionDialog}from"./expensive-redemption-dialog.tsx";
describe("expensive dialog",()=>{it("confirms explicitly",()=>{const fn=vi.fn();render(<ExpensiveRedemptionDialog open priceStars={100} onConfirm={fn} onCancel={()=>{}}/>);fireEvent.click(screen.getByText("Confirmar"));expect(fn).toHaveBeenCalledOnce();});});
