/** Correo del administrador principal (trigger handle_new_user). */
export const BOOTSTRAP_ADMIN_EMAIL = "dagudelo88@gmail.com";

export const BOOTSTRAP_ADMIN_EMAILS = [BOOTSTRAP_ADMIN_EMAIL] as const;

export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}
