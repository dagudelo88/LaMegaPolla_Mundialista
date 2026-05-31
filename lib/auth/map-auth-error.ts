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
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return es.errors.rateLimited;
  }
  return es.errors.generic;
}
