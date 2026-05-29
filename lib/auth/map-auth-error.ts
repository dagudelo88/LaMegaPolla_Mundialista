import { es } from "@/lib/i18n/es";

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return es.errors.invalidCredentials;
  }
  if (lower.includes("email not confirmed")) {
    return es.errors.emailNotConfirmed;
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return es.errors.emailTaken;
  }
  if (lower.includes("password")) {
    return es.errors.weakPassword;
  }
  return es.errors.generic;
}
