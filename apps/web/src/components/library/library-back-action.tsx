import Link from "next/link";

export type LibraryBackActionProps = Readonly<{
  returnDestination: string;
}>;

export function LibraryBackAction({ returnDestination }: LibraryBackActionProps) {
  return (
    <Link href={returnDestination} aria-label="Voltar para a Library">
      Voltar para a Library
    </Link>
  );
}
