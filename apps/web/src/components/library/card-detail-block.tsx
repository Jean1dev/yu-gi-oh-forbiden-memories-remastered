import type { ReactNode } from "react";

export type CardDetailField = Readonly<{
  label: string;
  value: ReactNode;
}>;

export type CardDetailBlockProps = Readonly<{
  title: string;
  fields: readonly CardDetailField[];
}>;

export function CardDetailBlock({ title, fields }: CardDetailBlockProps) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <section>
      <h2>{title}</h2>
      <dl>
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
