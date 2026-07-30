"use client";

import Link from "next/link";

export type LibraryBackActionProps = Readonly<{
  returnDestination: string;
  mode?: "link" | "history";
}>;

export function LibraryBackAction({ returnDestination, mode = "link" }: LibraryBackActionProps) {
  if (mode === "history") {
    return (
      <button type="button" aria-label="Voltar para a Library" onClick={() => history.back()}>
        Voltar para a Library
      </button>
    );
  }

  return (
    <Link href={returnDestination} aria-label="Voltar para a Library">
      Voltar para a Library
    </Link>
  );
}
