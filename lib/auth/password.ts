import { es } from "@/lib/i18n/es";

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validatePasswordPair(
  password: string,
  passwordConfirm: string
): PasswordValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: es.errors.weakPassword };
  }
  if (password !== passwordConfirm) {
    return { ok: false, error: es.errors.passwordMismatch };
  }
  return { ok: true };
}
