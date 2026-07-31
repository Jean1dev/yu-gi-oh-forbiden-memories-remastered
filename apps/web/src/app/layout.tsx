import { Press_Start_2P, VT323 } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

/**
 * The PS1-CRT design system's two typefaces (docs/estetica-visual.md's
 * successor: the imported Claude Design "forbidden-memories-remastered"
 * design system), self-hosted via `next/font` rather than the design's own
 * `<link>` tag so there is no runtime request to Google Fonts. Their
 * `variable` becomes `--font-display`/`--font-body` in globals.css.
 */
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

export const metadata = {
  title: "YuGiOh Forbidden Memories Remastered",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The whole UI is written in Brazilian Portuguese (every message map under
  // `components/**/messages.ts`), so the document language has to say so —
  // screen readers pick their voice from it.
  return (
    <html lang="pt-BR" className={`${pressStart2P.variable} ${vt323.variable}`}>
      <body>{children}</body>
    </html>
  );
}
