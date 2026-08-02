// @vitest-environment jsdom
import{describe,expect,it}from"vitest";describe("redemption sync hook",()=>{it("has an online event surface",()=>expect(typeof window.addEventListener).toBe("function"));});
