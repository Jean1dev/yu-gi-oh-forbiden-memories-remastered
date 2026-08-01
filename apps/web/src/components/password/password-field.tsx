import { PASSWORD_MAX_INPUT_LENGTH } from "@yugioh/shared";
import type { FormEvent } from "react";

import styles from "./password.module.css";

export type PasswordFieldProps = Readonly<{
  value: string;
  onChange(value: string): void;
  onSubmit(): void;
}>;

export function PasswordField({ value, onChange, onSubmit }: PasswordFieldProps) {
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (value.trim().length > 0) onSubmit();
  }

  return (
    <form className={styles.field} onSubmit={submit}>
      <label htmlFor="card-password">Digite a senha da carta</label>
      <div>
        <input
          id="card-password"
          name="cardPassword"
          inputMode="numeric"
          autoComplete="off"
          maxLength={PASSWORD_MAX_INPUT_LENGTH}
          placeholder="89 63 11 39"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <button type="submit" disabled={value.trim().length === 0}>
          Buscar
        </button>
      </div>
    </form>
  );
}
