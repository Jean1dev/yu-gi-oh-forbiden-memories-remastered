import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "YuGiOh Forbidden Memories Remastered",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The whole UI is written in Brazilian Portuguese (every message map under
  // `components/**/messages.ts`), so the document language has to say so —
  // screen readers pick their voice from it.
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
